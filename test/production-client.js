/**
 * Production IRREF Client
 * 
 * Uses persistent keys and key registry for non-repudiation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyManager } = require('./key-manager');
const { KeyRegistry } = require('./key-registry');
const { Message } = require('../irref-sdk/dist/index');

// Initialize key manager
const keysDir = path.join(__dirname, 'keys');
const keyManager = new KeyManager(keysDir, 'client');

// Initialize registry
const registry = new KeyRegistry(path.join(__dirname, 'key-registry.json'));

// Load or generate keys
let clientKeyPair, clientPublicKey, clientMetadata;

try {
    // Try to load existing keys
    const keyData = keyManager.load();
    clientKeyPair = keyData.keyPair;
    clientPublicKey = keyData.publicKey;
    clientMetadata = keyData.metadata;
    console.log('✓ Loaded existing client keys\n');
} catch (error) {
    // Generate new keys if they don't exist
    console.log('No existing keys found. Generating new keys...\n');
    clientKeyPair = keyManager.generateAndSave({
        identity: 'Client Service',
        organization: 'Your Company',
        contact: 'admin@yourcompany.com'
    });
    clientPublicKey = clientKeyPair.publicKey();
    clientMetadata = JSON.parse(fs.readFileSync(keyManager.metadataPath, 'utf8'));
    
    // Register public key
    const registration = registry.register(
        Buffer.from(clientPublicKey).toString('hex'),
        'Client Service',
        {
            organization: 'Your Company',
            contact: 'admin@yourcompany.com',
            registeredBy: 'self'
        }
    );
    
    console.log(`\n✓ Keys generated and registered`);
    console.log(`  Registration ID: ${registration.registrationId}\n`);
}

const SERVER_URL = 'http://localhost:3000';

// Send message with identity proof
async function sendMessage(payload, previousMessageHash = null) {
    // Create message
    const message = Message.create(
        payload,
        clientPublicKey,
        previousMessageHash
    );
    
    // Sign message
    const signedMessage = clientKeyPair.sign(message);
    
    // Get registration proof
    const registrationProof = registry.verify(
        Buffer.from(clientPublicKey).toString('hex')
    );
    
    if (!registrationProof.verified) {
        throw new Error('Client public key not registered!');
    }
    
    // Serialize message
    const messageBytes = signedMessage.toBytes();
    
    // Send with registration proof
    const postData = JSON.stringify({
        message: Buffer.from(messageBytes).toString('base64'),
        senderIdentity: registrationProof.identity,
        registrationId: registrationProof.registrationId,
        publicKeyProof: {
            publicKeyHex: Buffer.from(clientPublicKey).toString('hex'),
            registeredAt: registrationProof.registeredAt,
            registrationId: registrationProof.registrationId
        }
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/message',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Main
async function main() {
    console.log('=== Production IRREF Client ===\n');
    console.log('Client Identity:', clientMetadata.identity || 'Client Service');
    console.log('Public Key:', Buffer.from(clientPublicKey).toString('hex').substring(0, 32) + '...');
    console.log('Key Generated:', clientMetadata.generatedAt);
    console.log('');
    
    // Verify registration
    const registration = registry.verify(
        Buffer.from(clientPublicKey).toString('hex')
    );
    
    if (registration.verified) {
        console.log('✓ Public key is registered');
        console.log('  Identity:', registration.identity);
        console.log('  Registration ID:', registration.registrationId);
        console.log('  Registered:', registration.registeredAt);
        console.log('');
    } else {
        console.log('⚠ Public key not registered!');
        console.log('  Register it before sending messages.\n');
        return;
    }
    
    // Send test message
    console.log('Sending message...');
    try {
        const response = await sendMessage('Hello from production client!');
        console.log('✓ Message sent and verified');
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();


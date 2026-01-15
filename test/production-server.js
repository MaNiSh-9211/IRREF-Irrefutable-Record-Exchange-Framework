/**
 * Production IRREF Server
 * 
 * Uses persistent keys and verifies key registrations
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyManager } = require('./key-manager');
const { KeyRegistry } = require('./key-registry');
const { Message } = require('../irref-sdk/dist/index');

// Initialize key manager
const keysDir = path.join(__dirname, 'keys');
const serverKeyManager = new KeyManager(keysDir, 'server');

// Initialize registry
const registry = new KeyRegistry(path.join(__dirname, 'key-registry.json'));

// Load or generate server keys
let serverKeyPair, serverPublicKey, serverMetadata;

try {
    const keyData = serverKeyManager.load();
    serverKeyPair = keyData.keyPair;
    serverPublicKey = keyData.publicKey;
    serverMetadata = keyData.metadata;
    console.log('✓ Loaded existing server keys\n');
} catch (error) {
    console.log('No existing keys found. Generating new keys...\n');
    serverKeyPair = serverKeyManager.generateAndSave({
        identity: 'Server Service',
        organization: 'Your Company',
        contact: 'admin@yourcompany.com'
    });
    serverPublicKey = serverKeyPair.publicKey();
    serverMetadata = JSON.parse(fs.readFileSync(serverKeyManager.metadataPath, 'utf8'));
    
    // Register server public key
    const registration = registry.register(
        Buffer.from(serverPublicKey).toString('hex'),
        'Server Service',
        {
            organization: 'Your Company',
            contact: 'admin@yourcompany.com',
            registeredBy: 'self'
        }
    );
    
    console.log(`\n✓ Keys generated and registered`);
    console.log(`  Registration ID: ${registration.registrationId}\n`);
}

const PORT = 3000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/message') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const messageBytes = Buffer.from(requestData.message, 'base64');
                
                // Deserialize message
                const receivedMessage = Message.fromBytes(new Uint8Array(messageBytes));
                
                // Extract sender's public key
                const senderPublicKeyHex = Buffer.from(receivedMessage.senderPublicKey()).toString('hex');
                
                // Verify message signature
                const signatureValid = receivedMessage.verify();
                
                if (!signatureValid) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Message signature verification failed'
                    }));
                    return;
                }
                
                // Verify public key is registered
                const registration = registry.verify(senderPublicKeyHex);
                
                if (!registration.verified) {
                    console.log(`⚠ Unregistered public key: ${senderPublicKeyHex.substring(0, 32)}...`);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Sender public key not registered in registry',
                        senderPublicKeyHex: senderPublicKeyHex.substring(0, 32) + '...'
                    }));
                    return;
                }
                
                // Log verified message
                console.log(`[${new Date().toISOString()}] Received verified message:`);
                console.log(`  From: ${registration.identity}`);
                console.log(`  Registration ID: ${registration.registrationId}`);
                console.log(`  Payload: ${receivedMessage.payloadString()}`);
                console.log(`  ✓ Signature verified`);
                console.log(`  ✓ Identity verified (registered key)`);
                
                // Create response
                const responsePayload = JSON.stringify({
                    received: receivedMessage.statementId(),
                    verified: true,
                    senderIdentity: registration.identity,
                    timestamp: new Date().toISOString()
                });
                
                const responseMessage = Message.create(
                    responsePayload,
                    serverPublicKey,
                    receivedMessage.computeHash()
                );
                
                const signedResponse = serverKeyPair.sign(responseMessage);
                const responseBytes = signedResponse.toBytes();
                
                // Get server registration
                const serverRegistration = registry.verify(
                    Buffer.from(serverPublicKey).toString('hex')
                );
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: Buffer.from(responseBytes).toString('base64'),
                    serverPublicKey: Buffer.from(serverPublicKey).toString('base64'),
                    serverIdentity: serverRegistration.identity,
                    serverRegistrationId: serverRegistration.registrationId
                }));
                
            } catch (error) {
                console.error('Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/public-key') {
        const serverRegistration = registry.verify(
            Buffer.from(serverPublicKey).toString('hex')
        );
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            publicKey: Buffer.from(serverPublicKey).toString('base64'),
            identity: serverRegistration.identity,
            registrationId: serverRegistration.registrationId,
            registeredAt: serverRegistration.registeredAt
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log('=== Production IRREF Server ===\n');
    console.log('Server Identity:', serverMetadata.identity || 'Server Service');
    console.log('Public Key:', Buffer.from(serverPublicKey).toString('hex').substring(0, 32) + '...');
    console.log('Key Generated:', serverMetadata.generatedAt);
    
    const serverRegistration = registry.verify(
        Buffer.from(serverPublicKey).toString('hex')
    );
    
    if (serverRegistration.verified) {
        console.log('✓ Public key is registered');
        console.log('  Registration ID:', serverRegistration.registrationId);
    }
    
    console.log(`\nServer listening on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST /message - Send IRREF message (requires registered key)');
    console.log('  GET  /public-key - Get server public key and registration\n');
});


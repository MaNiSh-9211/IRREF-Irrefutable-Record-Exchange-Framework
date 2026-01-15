/**
 * Bank IRREF Server (Production)
 * 
 * Bank's server implementation with persistent keys.
 * Uses hardcoded keys (loaded from secure storage).
 * Public key is included in every response.
 * 
 * Setup:
 * 1. Generate key pair once
 * 2. Store keys securely (encrypted)
 * 3. Create legal attestation document
 * 4. Use same keys for all messages
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// ============================================================================
// KEY MANAGEMENT - Hardcoded Keys (Loaded from Secure Storage)
// ============================================================================

// In production, load keys from:
// - Environment variables (encrypted)
// - Secure key vault (AWS KMS, Azure Key Vault, HashiCorp Vault)
// - Hardware Security Module (HSM)
// - Encrypted file with password

// For this example, we'll load from encrypted file or environment
const KEYS_DIR = path.join(__dirname, 'bank-keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'private.key.encrypted');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.key');
const ATTESTATION_FILE = path.join(KEYS_DIR, 'legal-attestation.json');

// Load or generate bank keys
let bankKeyPair, bankPublicKey, bankPublicKeyHex, bankPublicKeyBase64;

function loadBankKeys() {
    // Option 1: Load from hardcoded constants (if set)
    // Uncomment to use hardcoded keys:
    /*
    if (HARDCODED_PRIVATE_KEY_ENCRYPTED && HARDCODED_PUBLIC_KEY_BASE64) {
        try {
            const privateKeyBytes = decryptKey(HARDCODED_PRIVATE_KEY_ENCRYPTED);
            const publicKeyBytes = Buffer.from(HARDCODED_PUBLIC_KEY_BASE64, 'base64');
            bankKeyPair = KeyPair.fromPrivateKey(new Uint8Array(privateKeyBytes));
            bankPublicKey = new Uint8Array(publicKeyBytes);
            bankPublicKeyHex = Buffer.from(bankPublicKey).toString('hex');
            bankPublicKeyBase64 = Buffer.from(bankPublicKey).toString('base64');
            console.log('✓ Loaded hardcoded bank keys');
            return true;
        } catch (error) {
            console.error('Error loading hardcoded keys:', error.message);
        }
    }
    */
    
    // Option 2: Load from environment variables
    if (process.env.BANK_PRIVATE_KEY_ENCRYPTED && process.env.BANK_PUBLIC_KEY_BASE64) {
        try {
            const privateKeyBytes = decryptKey(process.env.BANK_PRIVATE_KEY_ENCRYPTED);
            const publicKeyBytes = Buffer.from(process.env.BANK_PUBLIC_KEY_BASE64, 'base64');
            bankKeyPair = KeyPair.fromPrivateKey(new Uint8Array(privateKeyBytes));
            bankPublicKey = new Uint8Array(publicKeyBytes);
            bankPublicKeyHex = Buffer.from(bankPublicKey).toString('hex');
            bankPublicKeyBase64 = Buffer.from(bankPublicKey).toString('base64');
            console.log('✓ Loaded bank keys from environment variables');
            return true;
        } catch (error) {
            console.error('Error loading keys from environment:', error.message);
        }
    }
    
    // Option 3: Load from file (default)
    if (fs.existsSync(PRIVATE_KEY_FILE) && fs.existsSync(PUBLIC_KEY_FILE)) {
        try {
            // Load encrypted private key
            const encryptedPrivateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8');
            const privateKeyBytes = decryptKey(encryptedPrivateKey);
            
            // Load public key
            const publicKeyBase64 = fs.readFileSync(PUBLIC_KEY_FILE, 'utf8');
            const publicKeyBytes = Buffer.from(publicKeyBase64, 'base64');
            
            // Create key pair
            bankKeyPair = KeyPair.fromPrivateKey(new Uint8Array(privateKeyBytes));
            bankPublicKey = new Uint8Array(publicKeyBytes);
            bankPublicKeyHex = Buffer.from(bankPublicKey).toString('hex');
            bankPublicKeyBase64 = Buffer.from(bankPublicKey).toString('base64');
            
            console.log('✓ Loaded bank keys from secure storage');
            console.log(`  Public Key: ${bankPublicKeyHex.substring(0, 32)}...`);
            
            return true;
        } catch (error) {
            console.error('Error loading keys:', error.message);
            return false;
        }
    }
    
    // Generate new keys if they don't exist
    console.log('Generating new bank key pair...');
    bankKeyPair = KeyPair.generate();
    bankPublicKey = bankKeyPair.publicKey();
    bankPublicKeyHex = Buffer.from(bankPublicKey).toString('hex');
    bankPublicKeyBase64 = Buffer.from(bankPublicKey).toString('base64');
    
    // Save keys
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    
    // Encrypt and save private key
    const privateKeyBytes = bankKeyPair.privateKey();
    const encryptedPrivateKey = encryptKey(privateKeyBytes);
    fs.writeFileSync(PRIVATE_KEY_FILE, encryptedPrivateKey, 'utf8');
    
    // Save public key (plain text - it's public)
    fs.writeFileSync(PUBLIC_KEY_FILE, bankPublicKeyBase64, 'utf8');
    
    // Create legal attestation document
    createLegalAttestation();
    
    console.log('✓ Generated and saved bank keys');
    console.log(`  Private Key: ${PRIVATE_KEY_FILE} (encrypted)`);
    console.log(`  Public Key: ${PUBLIC_KEY_FILE}`);
    console.log(`  Public Key (hex): ${bankPublicKeyHex}`);
    console.log(`  Legal Attestation: ${ATTESTATION_FILE}`);
    console.log('\n⚠ IMPORTANT: Create legal attestation document and store securely!');
    
    return true;
}

// Simple encryption (use proper key management in production!)
function encryptKey(privateKey) {
    const password = process.env.BANK_KEY_PASSWORD || 'CHANGE_THIS_PASSWORD_IN_PRODUCTION';
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([salt, iv, encrypted]).toString('base64');
}

function decryptKey(encryptedData) {
    const password = process.env.BANK_KEY_PASSWORD || 'CHANGE_THIS_PASSWORD_IN_PRODUCTION';
    const crypto = require('crypto');
    const data = Buffer.from(encryptedData, 'base64');
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 32);
    const encrypted = data.slice(32);
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
}

// Create legal attestation document
function createLegalAttestation() {
    const attestation = {
        documentType: 'Legal Attestation of Public Key Ownership',
        entity: {
            name: 'Bank XYZ',
            legalName: 'Bank XYZ Inc.',
            registrationNumber: 'REG-123456',
            address: '123 Bank Street, City, Country',
            contact: 'security@bankxyz.com'
        },
        publicKey: {
            hex: bankPublicKeyHex,
            base64: bankPublicKeyBase64,
            algorithm: 'Ed25519',
            keySize: 256
        },
        attestation: {
            statement: `I, the authorized representative of ${'Bank XYZ'}, hereby attest that the public key with hexadecimal representation ${bankPublicKeyHex.substring(0, 32)}... is the legitimate public key belonging to ${'Bank XYZ'} and is used for signing IRREF messages.`,
            attestedBy: 'Bank XYZ Security Department',
            attestedAt: new Date().toISOString(),
            validFrom: new Date().toISOString(),
            validUntil: null, // No expiration
            legalBinding: true
        },
        timestamp: {
            created: new Date().toISOString(),
            // In production, get from trusted timestamp authority
            timestampAuthority: 'Self-attested (use trusted timestamp authority in production)'
        },
        metadata: {
            keyGenerated: new Date().toISOString(),
            purpose: 'IRREF message signing for API authentication',
            scope: 'All IRREF messages sent by Bank XYZ'
        }
    };
    
    fs.writeFileSync(ATTESTATION_FILE, JSON.stringify(attestation, null, 2), 'utf8');
    
    console.log('\n=== LEGAL ATTESTATION DOCUMENT ===');
    console.log(JSON.stringify(attestation, null, 2));
    console.log('\n⚠ Store this document securely and make it publicly verifiable!');
    
    return attestation;
}

// Load attestation
function loadAttestation() {
    if (fs.existsSync(ATTESTATION_FILE)) {
        return JSON.parse(fs.readFileSync(ATTESTATION_FILE, 'utf8'));
    }
    return null;
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

// Load keys on startup
if (!loadBankKeys()) {
    console.error('Failed to load bank keys. Exiting.');
    process.exit(1);
}

const attestation = loadAttestation();

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Endpoint: Get bank's public key and attestation
    if (req.method === 'GET' && req.url === '/public-key') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            publicKey: bankPublicKeyBase64,
            publicKeyHex: bankPublicKeyHex,
            entity: attestation?.entity || {
                name: 'Bank XYZ',
                legalName: 'Bank XYZ Inc.'
            },
            attestation: attestation ? {
                attestedAt: attestation.attestation.attestedAt,
                statement: attestation.attestation.statement,
                legalBinding: attestation.attestation.legalBinding
            } : null,
            algorithm: 'Ed25519',
            keySize: 256
        }));
        return;
    }

    // Endpoint: Process IRREF message
    if (req.method === 'POST' && req.url === '/api/process') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const messageBytes = Buffer.from(requestData.message, 'base64');
                
                // Deserialize IRREF message
                const receivedMessage = Message.fromBytes(new Uint8Array(messageBytes));
                
                console.log(`[${new Date().toISOString()}] Received IRREF message:`);
                console.log(`  Statement ID: ${receivedMessage.statementId()}`);
                console.log(`  Payload: ${receivedMessage.payloadString()}`);
                console.log(`  Sender: ${Buffer.from(receivedMessage.senderPublicKey()).toString('hex').substring(0, 32)}...`);
                
                // Verify message signature
                const verified = receivedMessage.verify();
                
                if (!verified) {
                    console.log('  ✗ Signature verification FAILED');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Message signature verification failed'
                    }));
                    return;
                }
                
                console.log('  ✓ Message verified successfully');
                
                // Process the request (your business logic here)
                const requestPayload = JSON.parse(receivedMessage.payloadString());
                
                // Example: Process API request
                const responseData = {
                    status: 'success',
                    message: 'Request processed successfully',
                    requestId: requestPayload.requestId || receivedMessage.statementId(),
                    processedAt: new Date().toISOString(),
                    data: {
                        // Your response data here
                        result: 'Operation completed'
                    }
                };
                
                // Create IRREF response message
                const responsePayload = JSON.stringify(responseData);
                
                // Chain to received message
                const responseMessage = Message.create(
                    responsePayload,
                    bankPublicKey,  // Bank's public key (included in every response)
                    receivedMessage.computeHash()  // Chain to received message
                );
                
                // Sign with bank's private key
                const signedResponse = bankKeyPair.sign(responseMessage);
                const responseBytes = signedResponse.toBytes();
                
                console.log('  ✓ Response message created and signed');
                
                // Send response with public key and attestation
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: Buffer.from(responseBytes).toString('base64'),
                    // Public key included in every response (as requested)
                    publicKey: bankPublicKeyBase64,
                    publicKeyHex: bankPublicKeyHex,
                    // Attestation included for verification
                    attestation: attestation ? {
                        entity: attestation.entity,
                        attestedAt: attestation.attestation.attestedAt,
                        statement: attestation.attestation.statement,
                        legalBinding: attestation.attestation.legalBinding
                    } : null,
                    // Message metadata
                    responseStatementId: signedResponse.statementId(),
                    responseTimestamp: new Date(signedResponse.timestamp() * 1000).toISOString()
                }));
                
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error:`, error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message || String(error)
                }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log('\n=== Bank IRREF Server ===\n');
    console.log('Entity:', attestation?.entity?.name || 'Bank XYZ');
    console.log('Public Key:', bankPublicKeyHex.substring(0, 32) + '...');
    console.log('Legal Attestation:', attestation ? '✓ Loaded' : '⚠ Not found');
    console.log(`\nServer listening on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  GET  /public-key - Get bank public key and attestation');
    console.log('  POST /api/process - Process IRREF message\n');
});


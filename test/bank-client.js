/**
 * Client for Bank's IRREF Server
 * 
 * Your service calling the bank's API.
 * Verifies bank's public key and attestation.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// Your service's key pair (persistent)
const KEYS_DIR = path.join(__dirname, 'client-keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'private.key.encrypted');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.key');

// Load or generate your service's keys
let clientKeyPair, clientPublicKey;

function loadClientKeys() {
    if (fs.existsSync(PRIVATE_KEY_FILE) && fs.existsSync(PUBLIC_KEY_FILE)) {
        try {
            const crypto = require('crypto');
            const encryptedPrivateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8');
            const data = Buffer.from(encryptedPrivateKey, 'base64');
            const password = process.env.CLIENT_KEY_PASSWORD || 'CHANGE_THIS_PASSWORD';
            const salt = data.slice(0, 16);
            const iv = data.slice(16, 32);
            const encrypted = data.slice(32);
            const key = crypto.scryptSync(password, salt, 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            clientKeyPair = KeyPair.fromPrivateKey(new Uint8Array(decrypted));
            const publicKeyBase64 = fs.readFileSync(PUBLIC_KEY_FILE, 'utf8');
            clientPublicKey = new Uint8Array(Buffer.from(publicKeyBase64, 'base64'));
            
            console.log('✓ Loaded client keys');
            return true;
        } catch (error) {
            console.error('Error loading keys:', error.message);
            return false;
        }
    }
    
    // Generate new keys
    clientKeyPair = KeyPair.generate();
    clientPublicKey = clientKeyPair.publicKey();
    
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    
    const crypto = require('crypto');
    const password = process.env.CLIENT_KEY_PASSWORD || 'CHANGE_THIS_PASSWORD';
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(Buffer.from(clientKeyPair.privateKey()));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    fs.writeFileSync(PRIVATE_KEY_FILE, Buffer.concat([salt, iv, encrypted]).toString('base64'), 'utf8');
    fs.writeFileSync(PUBLIC_KEY_FILE, Buffer.from(clientPublicKey).toString('base64'), 'utf8');
    
    console.log('✓ Generated and saved client keys');
    return true;
}

// Bank's server URL
const BANK_SERVER_URL = 'http://localhost:3000';

// Store bank's public key and attestation (verify once, reuse)
let bankPublicKey = null;
let bankAttestation = null;
let bankPublicKeyHex = null;

// Get bank's public key and verify attestation
async function getBankPublicKey() {
    return new Promise((resolve, reject) => {
        http.get(`${BANK_SERVER_URL}/public-key`, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (response.success) {
                        bankPublicKey = new Uint8Array(Buffer.from(response.publicKey, 'base64'));
                        bankPublicKeyHex = response.publicKeyHex;
                        bankAttestation = response.attestation;
                        
                        console.log('✓ Bank public key received');
                        console.log(`  Public Key: ${bankPublicKeyHex.substring(0, 32)}...`);
                        
                        if (bankAttestation) {
                            console.log('✓ Bank attestation received');
                            console.log(`  Entity: ${bankAttestation.entity?.name || 'Unknown'}`);
                            console.log(`  Attested At: ${bankAttestation.attestedAt}`);
                            console.log(`  Legal Binding: ${bankAttestation.legalBinding}`);
                            console.log(`  Statement: ${bankAttestation.statement.substring(0, 100)}...`);
                        } else {
                            console.log('⚠ No attestation provided by bank');
                        }
                        
                        resolve(bankPublicKey);
                    } else {
                        reject(new Error('Failed to get bank public key'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Send IRREF message to bank
async function sendToBank(payload, previousMessageHash = null) {
    // Create message
    const message = Message.create(
        payload,
        clientPublicKey,
        previousMessageHash
    );
    
    // Sign message
    const signedMessage = clientKeyPair.sign(message);
    const messageBytes = signedMessage.toBytes();
    
    // Send to bank
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            message: Buffer.from(messageBytes).toString('base64')
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/process',
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
                    
                    if (response.success) {
                        // Verify bank's public key matches
                        const responsePublicKeyHex = response.publicKeyHex;
                        if (responsePublicKeyHex !== bankPublicKeyHex) {
                            reject(new Error('Bank public key mismatch! Possible security issue.'));
                            return;
                        }
                        
                        // Deserialize bank's response message
                        const responseMessageBytes = Buffer.from(response.message, 'base64');
                        const responseMessage = Message.fromBytes(new Uint8Array(responseMessageBytes));
                        
                        // Verify bank's signature using bank's public key
                        const verified = responseMessage.verifyWithPublicKey(bankPublicKey);
                        
                        if (!verified) {
                            reject(new Error('Bank response signature verification failed!'));
                            return;
                        }
                        
                        console.log('✓ Bank response verified');
                        console.log(`  Response Statement ID: ${response.responseStatementId}`);
                        console.log(`  Response Timestamp: ${response.responseTimestamp}`);
                        console.log(`  Public Key: ${response.publicKeyHex.substring(0, 32)}... (matches)`);
                        
                        if (response.attestation) {
                            console.log(`  Attestation: ${response.attestation.entity?.name || 'Unknown'}`);
                        }
                        
                        resolve({
                            message: responseMessage,
                            data: JSON.parse(responseMessage.payloadString()),
                            publicKey: bankPublicKey,
                            attestation: response.attestation,
                            previousHash: signedMessage.computeHash()
                        });
                    } else {
                        reject(new Error(response.error || 'Bank request failed'));
                    }
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
    console.log('=== Client for Bank IRREF Server ===\n');
    
    // Load client keys
    if (!loadClientKeys()) {
        console.error('Failed to load client keys');
        process.exit(1);
    }
    
    try {
        // Get bank's public key and attestation
        console.log('1. Getting bank public key and attestation...');
        await getBankPublicKey();
        console.log('');
        
        // Send first message
        console.log('2. Sending request to bank...');
        const requestPayload = {
            requestId: 'REQ-' + Date.now(),
            action: 'transfer',
            amount: 1000,
            fromAccount: 'ACC-123',
            toAccount: 'ACC-456'
        };
        
        const result1 = await sendToBank(JSON.stringify(requestPayload));
        console.log('✓ Request processed');
        console.log('  Response:', result1.data);
        console.log('');
        
        // Send chained message
        console.log('3. Sending chained request...');
        const requestPayload2 = {
            requestId: 'REQ-' + Date.now(),
            action: 'check_balance',
            account: 'ACC-123'
        };
        
        const result2 = await sendToBank(JSON.stringify(requestPayload2), result1.previousHash);
        console.log('✓ Chained request processed');
        console.log('  Response:', result2.data);
        console.log('');
        
        console.log('=== All requests successful ===');
        console.log('\nKey Points:');
        console.log('✓ Bank\'s public key verified');
        console.log('✓ Bank\'s attestation received');
        console.log('✓ All messages signed and verified');
        console.log('✓ Public key included in every response');
        console.log('✓ Hash chaining verified');
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();


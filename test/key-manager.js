/**
 * Key Manager for IRREF
 * 
 * Manages persistent key pairs for production use.
 * Keys are generated once and stored securely.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { KeyPair } = require('../irref-sdk/dist/index');

class KeyManager {
    constructor(keyDir, keyName) {
        this.keyDir = keyDir;
        this.keyName = keyName;
        this.privateKeyPath = path.join(keyDir, `${keyName}.private.key`);
        this.publicKeyPath = path.join(keyDir, `${keyName}.public.key`);
        this.metadataPath = path.join(keyDir, `${keyName}.metadata.json`);
        
        // Ensure key directory exists
        if (!fs.existsSync(keyDir)) {
            fs.mkdirSync(keyDir, { recursive: true });
        }
    }

    /**
     * Generate a new key pair and save it
     */
    generateAndSave(metadata = {}) {
        console.log(`Generating new key pair: ${this.keyName}...`);
        
        // Generate key pair
        const keyPair = KeyPair.generate();
        const privateKey = keyPair.privateKey();
        const publicKey = keyPair.publicKey();
        
        // Encrypt private key before saving
        const encryptedPrivateKey = this.encryptPrivateKey(privateKey);
        
        // Save keys
        fs.writeFileSync(this.privateKeyPath, encryptedPrivateKey, 'utf8');
        fs.writeFileSync(this.publicKeyPath, Buffer.from(publicKey).toString('base64'), 'utf8');
        
        // Save metadata
        const keyMetadata = {
            keyName: this.keyName,
            generatedAt: new Date().toISOString(),
            publicKeyHex: Buffer.from(publicKey).toString('hex'),
            publicKeyBase64: Buffer.from(publicKey).toString('base64'),
            ...metadata
        };
        fs.writeFileSync(this.metadataPath, JSON.stringify(keyMetadata, null, 2), 'utf8');
        
        console.log(`✓ Key pair saved:`);
        console.log(`  Private key: ${this.privateKeyPath}`);
        console.log(`  Public key: ${this.publicKeyPath}`);
        console.log(`  Metadata: ${this.metadataPath}`);
        console.log(`  Public key (hex): ${keyMetadata.publicKeyHex}`);
        
        return keyPair;
    }

    /**
     * Load existing key pair
     */
    load() {
        if (!fs.existsSync(this.privateKeyPath)) {
            throw new Error(`Private key not found: ${this.privateKeyPath}. Run generateAndSave() first.`);
        }
        
        if (!fs.existsSync(this.publicKeyPath)) {
            throw new Error(`Public key not found: ${this.publicKeyPath}`);
        }
        
        // Load and decrypt private key
        const encryptedPrivateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
        const privateKey = this.decryptPrivateKey(encryptedPrivateKey);
        
        // Load public key
        const publicKeyBase64 = fs.readFileSync(this.publicKeyPath, 'utf8');
        const publicKey = Buffer.from(publicKeyBase64, 'base64');
        
        // Verify they match
        const keyPair = KeyPair.fromPrivateKey(new Uint8Array(privateKey));
        const loadedPublicKey = keyPair.publicKey();
        
        if (Buffer.from(loadedPublicKey).toString('hex') !== Buffer.from(publicKey).toString('hex')) {
            throw new Error('Private and public keys do not match!');
        }
        
        // Load metadata
        let metadata = {};
        if (fs.existsSync(this.metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'));
        }
        
        console.log(`✓ Loaded key pair: ${this.keyName}`);
        console.log(`  Generated: ${metadata.generatedAt || 'Unknown'}`);
        console.log(`  Public key: ${metadata.publicKeyHex || Buffer.from(publicKey).toString('hex')}`);
        
        return {
            keyPair,
            publicKey: new Uint8Array(publicKey),
            metadata
        };
    }

    /**
     * Get public key (for sharing/registration)
     */
    getPublicKey() {
        if (!fs.existsSync(this.publicKeyPath)) {
            throw new Error(`Public key not found: ${this.publicKeyPath}`);
        }
        
        const publicKeyBase64 = fs.readFileSync(this.publicKeyPath, 'utf8');
        const publicKey = Buffer.from(publicKeyBase64, 'base64');
        const metadata = fs.existsSync(this.metadataPath) 
            ? JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'))
            : {};
        
        return {
            publicKey: new Uint8Array(publicKey),
            publicKeyHex: Buffer.from(publicKey).toString('hex'),
            publicKeyBase64: Buffer.from(publicKey).toString('base64'),
            metadata
        };
    }

    /**
     * Encrypt private key (simple encryption - use stronger in production!)
     */
    encryptPrivateKey(privateKey) {
        // In production, use proper key management (HSM, AWS KMS, Azure Key Vault, etc.)
        // This is a simple example using a password-based encryption
        
        // For demo: use environment variable or prompt for password
        const password = process.env.IRREF_KEY_PASSWORD || 'change-me-in-production';
        const salt = crypto.randomBytes(16);
        const key = crypto.scryptSync(password, salt, 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(Buffer.from(privateKey));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        // Format: salt:iv:encrypted
        return Buffer.concat([salt, iv, encrypted]).toString('base64');
    }

    /**
     * Decrypt private key
     */
    decryptPrivateKey(encryptedData) {
        const password = process.env.IRREF_KEY_PASSWORD || 'change-me-in-production';
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

    /**
     * Export public key for registration
     */
    exportForRegistration() {
        const publicKeyInfo = this.getPublicKey();
        
        return {
            keyName: this.keyName,
            publicKeyHex: publicKeyInfo.publicKeyHex,
            publicKeyBase64: publicKeyInfo.publicKeyBase64,
            generatedAt: publicKeyInfo.metadata.generatedAt,
            // Add identity information
            identity: publicKeyInfo.metadata.identity || 'Not specified',
            // Add attestation (if available)
            attestation: publicKeyInfo.metadata.attestation || null
        };
    }
}

module.exports = { KeyManager };


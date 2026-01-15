/**
 * Example: How to Hardcode Keys in Bank Server
 * 
 * This shows different ways to hardcode keys in production.
 * Copy the approach you prefer to bank-server.js
 */

// ============================================================================
// METHOD 1: Hardcode Encrypted Private Key + Public Key (Base64)
// ============================================================================

// Step 1: Generate keys once and get the encrypted private key and public key
// Run: node -e "const {KeyPair} = require('./irref-sdk/dist/index'); const kp = KeyPair.generate(); console.log('Private:', Buffer.from(kp.privateKey()).toString('base64')); console.log('Public:', Buffer.from(kp.publicKey()).toString('base64'));"

// Step 2: Encrypt the private key (use same encryption as bank-server.js)
// Step 3: Hardcode both in your server:

const HARDCODED_PRIVATE_KEY_ENCRYPTED = `
YOUR_ENCRYPTED_PRIVATE_KEY_BASE64_HERE
`.trim();

const HARDCODED_PUBLIC_KEY_BASE64 = `
YOUR_PUBLIC_KEY_BASE64_HERE
`.trim();

// ============================================================================
// METHOD 2: Hardcode Private Key + Public Key (Both Encrypted)
// ============================================================================

// Both keys encrypted (extra security):
const HARDCODED_PRIVATE_KEY_ENCRYPTED_2 = `...`;
const HARDCODED_PUBLIC_KEY_ENCRYPTED_2 = `...`; // Decrypt when needed

// ============================================================================
// METHOD 3: Hardcode as Hex Strings
// ============================================================================

const HARDCODED_PRIVATE_KEY_HEX = `your_32_byte_hex_string_here`;
const HARDCODED_PUBLIC_KEY_HEX = `your_32_byte_hex_string_here`;

// Usage:
// const privateKeyBytes = Buffer.from(HARDCODED_PRIVATE_KEY_HEX, 'hex');
// const publicKeyBytes = Buffer.from(HARDCODED_PUBLIC_KEY_HEX, 'hex');

// ============================================================================
// METHOD 4: Hardcode in Environment Variables (Recommended)
// ============================================================================

// Set in your deployment:
// export BANK_PRIVATE_KEY_ENCRYPTED="encrypted_key_here"
// export BANK_PUBLIC_KEY_BASE64="public_key_here"

// Then in code:
// const privateKey = process.env.BANK_PRIVATE_KEY_ENCRYPTED;
// const publicKey = process.env.BANK_PUBLIC_KEY_BASE64;

// ============================================================================
// METHOD 5: Hardcode in Config File (Not in Git!)
// ============================================================================

// config/keys.production.js (add to .gitignore):
// module.exports = {
//   privateKeyEncrypted: '...',
//   publicKeyBase64: '...'
// };

// Then in bank-server.js:
// const keys = require('./config/keys.production');
// const privateKey = keys.privateKeyEncrypted;
// const publicKey = keys.publicKeyBase64;

// ============================================================================
// USAGE IN bank-server.js
// ============================================================================

// Replace the loadBankKeys() function with:

function loadBankKeysHardcoded() {
    // Decrypt private key
    const privateKeyBytes = decryptKey(HARDCODED_PRIVATE_KEY_ENCRYPTED);
    
    // Load public key
    const publicKeyBytes = Buffer.from(HARDCODED_PUBLIC_KEY_BASE64, 'base64');
    
    // Create key pair
    bankKeyPair = KeyPair.fromPrivateKey(new Uint8Array(privateKeyBytes));
    bankPublicKey = new Uint8Array(publicKeyBytes);
    bankPublicKeyHex = Buffer.from(bankPublicKey).toString('hex');
    bankPublicKeyBase64 = Buffer.from(bankPublicKey).toString('base64');
    
    console.log('✓ Loaded hardcoded bank keys');
    console.log(`  Public Key: ${bankPublicKeyHex.substring(0, 32)}...`);
    
    return true;
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

// ⚠️ IMPORTANT:
// 1. Never commit private keys to Git (even encrypted)
// 2. Use environment variables or secure config files
// 3. Restrict file permissions (chmod 600)
// 4. Use key management service in production (HSM, KMS, Vault)
// 5. Rotate keys periodically if needed
// 6. Audit key usage

// ✅ Public key can be:
// - Hardcoded (it's public anyway)
// - Included in every response
// - Shared publicly
// - Committed to Git

// 🔒 Private key should be:
// - Encrypted at rest
// - Never logged
// - Never transmitted
// - Stored securely (HSM/KMS recommended)
// - Access restricted


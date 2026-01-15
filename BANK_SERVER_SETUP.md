# Bank Server Setup - Option D (Legal Attestation)

## Overview

This implements **Option D: Self-Attestation with Legal Binding** for the bank's server.

**Key Features:**
- ✅ Persistent keys (hardcoded/loaded from secure storage)
- ✅ Public key included in every response
- ✅ Legal attestation document created
- ✅ Keys generated once, reused forever
- ✅ Private key encrypted (not plain text)

## Architecture

```
Your Service (Client)          Bank's Server
     │                              │
     │  1. Get Public Key           │
     │  + Attestation               │
     ├─────────────────────────────>│
     │<─────────────────────────────┤
     │  Public Key + Attestation     │
     │                              │
     │  2. Send IRREF Message       │
     │  (signed with your key)      │
     ├─────────────────────────────>│
     │                              │
     │  3. Process Request          │
     │  (verify your message)       │
     │                              │
     │  4. Send IRREF Response      │
     │  (signed with bank's key)    │
     │  + Public Key (every time)   │
     │<─────────────────────────────┤
     │  Response + Public Key       │
     │                              │
     │  5. Verify Response          │
     │  (using bank's public key)   │
     │                              │
```

## Setup Instructions

### Step 1: Generate Bank Keys (One Time)

```bash
cd test
node bank-server.js
```

**First run will:**
1. Generate Ed25519 key pair
2. Encrypt and save private key to `bank-keys/private.key.encrypted`
3. Save public key to `bank-keys/public.key`
4. Create legal attestation document at `bank-keys/legal-attestation.json`

**Output:**
```
Generating new bank key pair...
✓ Generated and saved bank keys
  Private Key: bank-keys/private.key.encrypted (encrypted)
  Public Key: bank-keys/public.key
  Public Key (hex): abc123def456...
  Legal Attestation: bank-keys/legal-attestation.json

⚠ IMPORTANT: Create legal attestation document and store securely!
```

### Step 2: Review Legal Attestation

The file `bank-keys/legal-attestation.json` contains:

```json
{
  "documentType": "Legal Attestation of Public Key Ownership",
  "entity": {
    "name": "Bank XYZ",
    "legalName": "Bank XYZ Inc.",
    "registrationNumber": "REG-123456",
    "address": "123 Bank Street, City, Country",
    "contact": "security@bankxyz.com"
  },
  "publicKey": {
    "hex": "abc123def456...",
    "base64": "q8Ej3vRW...",
    "algorithm": "Ed25519",
    "keySize": 256
  },
  "attestation": {
    "statement": "I, the authorized representative of Bank XYZ, hereby attest that the public key...",
    "attestedBy": "Bank XYZ Security Department",
    "attestedAt": "2024-01-15T10:00:00.000Z",
    "legalBinding": true
  }
}
```

**Action Required:**
1. Review and customize the attestation document
2. Have authorized bank representative sign it
3. Store with timestamp authority (optional but recommended)
4. Make it publicly verifiable (publish on website, blockchain, etc.)

### Step 3: Secure Private Key

**Current Implementation:**
- Private key is encrypted using password-based encryption
- Password from environment variable: `BANK_KEY_PASSWORD`

**Production Recommendations:**

**Option A: Environment Variable**
```bash
export BANK_KEY_PASSWORD="strong-random-password-here"
node bank-server.js
```

**Option B: Key Management Service**
- AWS KMS
- Azure Key Vault
- HashiCorp Vault
- Google Cloud KMS

**Option C: Hardware Security Module (HSM)**
- Store private key in HSM
- Sign operations happen in HSM
- Private key never leaves HSM

**Option D: Encrypted File with Strong Password**
```javascript
// Use strong password, store securely
const password = loadPasswordFromSecureVault();
```

### Step 4: Deploy Server

```bash
# Set password
export BANK_KEY_PASSWORD="your-secure-password"

# Start server
node bank-server.js
```

Server will:
- Load encrypted private key
- Load public key
- Load legal attestation
- Start listening on port 3000

## How It Works

### 1. Key Storage

**Private Key:**
- Encrypted and stored in `bank-keys/private.key.encrypted`
- Decrypted in memory when needed
- Never transmitted or logged

**Public Key:**
- Stored in plain text (it's public anyway)
- Included in every response
- Can be shared publicly

### 2. Message Flow

**Client → Bank:**
```
1. Client creates message
2. Client signs with client's private key
3. Client sends to bank
4. Bank verifies using client's public key (from message)
```

**Bank → Client:**
```
1. Bank creates response message
2. Bank signs with bank's private key (hardcoded/loaded)
3. Bank includes bank's public key in response
4. Client verifies using bank's public key (from response)
```

### 3. Public Key in Every Response

Every response includes:
```json
{
  "success": true,
  "message": "base64_cbor_message",
  "publicKey": "base64_public_key",      // ← Always included
  "publicKeyHex": "hex_public_key",      // ← Always included
  "attestation": { ... },                 // ← Attestation info
  "responseStatementId": "...",
  "responseTimestamp": "..."
}
```

**Why?**
- Client can verify response signature
- Client can confirm it's from the same bank
- Client can check attestation
- Prevents key substitution attacks

### 4. Legal Attestation

**Included in:**
- `/public-key` endpoint response
- Every `/api/process` response (optional, but recommended)

**Contains:**
- Entity information (Bank XYZ)
- Public key
- Attestation statement
- Timestamp
- Legal binding confirmation

## Testing

### Test 1: Get Bank Public Key

```bash
curl http://localhost:3000/public-key
```

**Response:**
```json
{
  "success": true,
  "publicKey": "base64...",
  "publicKeyHex": "hex...",
  "entity": {
    "name": "Bank XYZ",
    "legalName": "Bank XYZ Inc."
  },
  "attestation": {
    "attestedAt": "2024-01-15T10:00:00.000Z",
    "statement": "I, the authorized representative...",
    "legalBinding": true
  }
}
```

### Test 2: Send Message (Use bank-client.js)

```bash
node bank-client.js
```

This will:
1. Get bank's public key
2. Verify attestation
3. Send IRREF message
4. Verify bank's response
5. Check public key matches

## Security Considerations

### ✅ What's Secure

1. **Private Key Encryption**: Private key is encrypted at rest
2. **In-Memory Only**: Private key decrypted only in memory
3. **Public Key Verification**: Client verifies bank's public key matches
4. **Signature Verification**: All messages verified cryptographically
5. **Legal Attestation**: Proof of key ownership

### ⚠️ Production Improvements Needed

1. **Stronger Key Storage**: Use HSM or key management service
2. **Password Management**: Use secure password vault
3. **Timestamp Authority**: Get legal attestation timestamped by trusted authority
4. **Public Registry**: Publish attestation to public registry/blockchain
5. **Key Rotation**: Plan for key rotation (if needed)
6. **Audit Logging**: Log all key usage
7. **Access Control**: Restrict access to private key file

## Non-Repudiation Proof

**Scenario: Bank denies sending message in 2026**

**You can prove:**
1. **Message Signature**: Valid Ed25519 signature (only bank's private key could create it)
2. **Public Key**: Matches the one in every response
3. **Legal Attestation**: Bank attested to key ownership in 2024
4. **Attestation Document**: Signed/dated document exists
5. **Consistency**: Same public key used in all messages

**Bank cannot deny:**
- Signature proves they sent it (only they have private key)
- They attested to key ownership (legal document)
- Public key matches in all responses (consistency)
- Attestation is legally binding

## Files

- `test/bank-server.js` - Bank's server with persistent keys
- `test/bank-client.js` - Your service calling bank's API
- `test/bank-keys/` - Directory for bank keys (created on first run)
- `BANK_SERVER_SETUP.md` - This document

## Next Steps

1. ✅ Generate keys (one time)
2. ✅ Review and customize legal attestation
3. ✅ Have authorized representative sign attestation
4. ✅ Store attestation publicly (website, blockchain, etc.)
5. ✅ Secure private key storage (HSM/KMS recommended)
6. ✅ Deploy server
7. ✅ Test with client
8. ✅ Monitor and audit

---

**Key Point**: Private key is **encrypted**, not plain text. Public key is **included in every response** as requested. Legal attestation provides **proof of ownership** for non-repudiation.


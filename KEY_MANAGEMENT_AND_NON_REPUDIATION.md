# Key Management and Non-Repudiation in IRREF

## The Problem You Identified

You're absolutely right! The current test implementation has a critical flaw:

**Current Test Setup:**
- Client generates new keys every time `client.js` runs
- Server generates new keys every time `server.js` runs
- Keys are not persisted or registered
- **Problem**: A bank could deny ownership by saying "That's not my public key!"

## How It Should Work in Production

### 1. Persistent Key Pairs

**Each party must have ONE persistent key pair that they use for all messages.**

```
Bank (Client):
  - Generates key pair ONCE (when setting up system)
  - Stores private key securely (HSM, key vault, encrypted storage)
  - Registers public key with a trusted authority
  - Uses SAME key pair for all messages

Your Service (Server):
  - Generates key pair ONCE
  - Stores private key securely
  - Registers public key publicly
  - Uses SAME key pair for all messages
```

### 2. Key Registration/Attestation

**Public keys must be registered to prove ownership:**

**Option A: Certificate Authority (CA)**
```
1. Bank generates key pair
2. Bank sends public key to CA with proof of identity
3. CA issues certificate: "This public key belongs to Bank XYZ"
4. Bank includes certificate in messages
5. Verifier checks certificate with CA
```

**Option B: Public Registry/Blockchain**
```
1. Bank generates key pair
2. Bank publishes public key to registry with identity proof
3. Registry creates immutable record: "Bank XYZ → Public Key ABC"
4. Anyone can verify: "Does this public key belong to Bank XYZ?"
```

**Option C: Notary/Trusted Third Party**
```
1. Bank generates key pair
2. Bank attests to notary: "This is my public key"
3. Notary creates signed record
4. Verifier checks with notary
```

**Option D: Self-Attestation with Legal Binding**
```
1. Bank generates key pair
2. Bank signs legal document: "I attest that public key ABC is mine"
3. Document stored with timestamp authority
4. Legal proof of key ownership
```

### 3. Message Structure with Key Attestation

**Current Message:**
```json
{
  "sender_public_key": "ABC123...",
  "payload": "...",
  "signature": "..."
}
```

**Production Message (with attestation):**
```json
{
  "sender_public_key": "ABC123...",
  "sender_identity": "Bank XYZ",
  "key_attestation": {
    "type": "certificate",
    "certificate": "base64_certificate",
    "issuer": "Trusted CA"
  },
  "payload": "...",
  "signature": "..."
}
```

## Implementation: Persistent Keys

I've created production-ready implementations:

### Files Created:

1. **`test/key-manager.js`** - Manages persistent key pairs
2. **`test/key-registry.js`** - Simple registry for key-to-identity mapping
3. **`test/production-client.js`** - Client with persistent keys
4. **`test/production-server.js`** - Server with persistent keys

### How to Use:

#### Step 1: Generate and Register Keys

```bash
# First time: Generate client keys
node -e "
const { KeyManager } = require('./key-manager');
const { KeyRegistry } = require('./key-registry');
const km = new KeyManager('./keys', 'bank-client');
const reg = new KeyRegistry('./key-registry.json');
const kp = km.generateAndSave({
  identity: 'Bank XYZ',
  organization: 'Bank XYZ Inc.',
  contact: 'security@bankxyz.com'
});
const pubKey = kp.publicKey();
reg.register(
  Buffer.from(pubKey).toString('hex'),
  'Bank XYZ',
  { organization: 'Bank XYZ Inc.' }
);
console.log('✓ Bank keys generated and registered');
"
```

#### Step 2: Use Persistent Keys

```javascript
// Client always uses the same key pair
const keyManager = new KeyManager('./keys', 'bank-client');
const { keyPair, publicKey } = keyManager.load(); // Same keys every time!

// Server verifies registration
const registry = new KeyRegistry('./key-registry.json');
const registration = registry.verify(publicKeyHex);
if (!registration.verified) {
  throw new Error('Public key not registered!');
}
```

## Answering Your Questions

### Q1: "Whose keys are actually being used?"

**Answer:**
- **Client uses client's keys** (client's private key to sign, client's public key in message)
- **Server uses server's keys** (server's private key to sign responses, server's public key in responses)
- **Each message includes the sender's public key** so receiver knows who signed it

**Flow:**
```
Client Message:
  - Signed with: Client's private key
  - Contains: Client's public key
  - Verified by: Server (using client's public key from message)

Server Response:
  - Signed with: Server's private key
  - Contains: Server's public key
  - Verified by: Client (using server's public key from response)
```

### Q2: "If keys generated for every request, how to prove ownership after one year?"

**Answer:**
- **Keys should NOT be generated for every request!**
- **Keys should be generated ONCE and reused**
- **Public key must be registered/attested BEFORE use**

**Solution:**
1. Bank generates key pair ONCE (e.g., when setting up system in 2024)
2. Bank registers public key with CA/registry/notary in 2024
3. Bank uses SAME key pair for all messages (2024, 2025, 2026, etc.)
4. In 2026, you can prove: "This public key was registered to Bank XYZ in 2024"
5. Bank cannot deny: "That's not my key" because it's registered

### Q3: "How to make bank believe this public key was theirs?"

**Answer:**
You need **key attestation/registration**:

**Method 1: Certificate Authority**
```
1. Bank gets certificate from CA (like SSL certificates)
2. Certificate proves: "Public key ABC belongs to Bank XYZ"
3. You store certificate with messages
4. Bank cannot deny - CA has proof
```

**Method 2: Public Registry**
```
1. Bank registers public key in public registry (2024)
2. Registry creates immutable record
3. You can prove: "Registry shows Bank XYZ registered this key in 2024"
4. Bank cannot deny - registry has proof
```

**Method 3: Legal Attestation**
```
1. Bank signs legal document attesting to key ownership (2024)
2. Document stored with timestamp authority
3. You can prove: "Bank signed document in 2024 attesting to this key"
4. Bank cannot deny - legal document exists
```

**Method 4: Blockchain/Immutable Ledger**
```
1. Bank publishes public key to blockchain (2024)
2. Blockchain creates immutable record
3. You can prove: "Blockchain shows Bank XYZ published this key in 2024"
4. Bank cannot deny - blockchain is immutable
```

## Production Workflow

### Setup Phase (One Time)

```
1. Bank generates key pair
2. Bank stores private key securely (HSM, key vault)
3. Bank registers public key:
   - Option A: Get certificate from CA
   - Option B: Register in public registry
   - Option C: Attest to notary
   - Option D: Sign legal document
4. Registration creates proof: "Bank XYZ → Public Key ABC"
```

### Message Exchange Phase (Ongoing)

```
1. Bank creates message
2. Bank signs with private key (same key pair from setup)
3. Bank includes:
   - Public key (same one from setup)
   - Registration proof (certificate/registry ID)
   - Identity (Bank XYZ)
4. You receive message
5. You verify:
   - Signature (using public key from message)
   - Registration (check CA/registry/notary)
   - Identity matches registration
```

### Dispute Phase (If Needed)

```
1. Bank says: "I never sent that message"
2. You prove:
   - Message has valid signature
   - Signature verified with public key ABC
   - Public key ABC was registered to Bank XYZ in 2024
   - Registration proof (certificate/registry record)
3. Bank cannot deny:
   - Only they have private key (signature proves it)
   - They registered the public key (registration proves it)
   - They cannot claim "not my key" (registration proves ownership)
```

## Example: Bank Scenario

### Year 2024: Setup

```
Bank generates key pair:
  Private Key: [SECRET - stored in HSM]
  Public Key: ABC123...

Bank registers with CA:
  CA issues certificate:
    "This public key ABC123 belongs to Bank XYZ"
    Signed by: Trusted CA
    Valid from: 2024-01-01
    Valid to: 2034-01-01

Certificate stored in public registry.
```

### Year 2025: Message Exchange

```
Bank sends message:
  {
    "sender_public_key": "ABC123...",
    "sender_identity": "Bank XYZ",
    "certificate": "base64_certificate",
    "payload": "Transfer $1M to account 123",
    "signature": "xyz789..."
  }

You verify:
  1. Check certificate with CA → Valid
  2. Verify certificate says "Bank XYZ" → Matches
  3. Verify signature with public key ABC123 → Valid
  4. Message is authentic and non-repudiable
```

### Year 2026: Dispute

```
Bank says: "I never sent that message"

You prove:
  1. Message signature is valid (only Bank's private key could create it)
  2. Public key ABC123 was registered to Bank XYZ in 2024
  3. Certificate from CA proves ownership
  4. Bank cannot deny - all proof exists

Bank cannot deny because:
  - Signature proves they sent it (only they have private key)
  - Registration proves key ownership (they registered it)
  - Certificate proves identity (CA verified it)
```

## Key Takeaways

✅ **Keys must be persistent** - Generate once, reuse forever  
✅ **Keys must be registered** - Prove ownership before use  
✅ **Registration must be verifiable** - CA, registry, notary, or legal document  
✅ **Messages include registration proof** - Certificate or registry ID  
✅ **Verification checks both signature AND registration** - Two-layer proof  

**Without key registration, non-repudiation is incomplete!**

The implementations I created (`key-manager.js`, `key-registry.js`, `production-client.js`, `production-server.js`) show how to implement persistent keys and key registration for production use.

# IRREF Internal Architecture - Deep Dive

## Table of Contents
1. [Key Generation](#1-key-generation)
2. [Message Signing Process](#2-message-signing-process)
3. [Message Verification Process](#3-message-verification-process)
4. [Hash Chaining](#4-hash-chaining)
5. [Complete Flow: Client to Server](#5-complete-flow-client-to-server)
6. [Cryptographic Primitives](#6-cryptographic-primitives)

---

## 1. Key Generation

### Who Generates Keys?

**Each party generates their own keys independently:**
- **Client** generates its own key pair when `client.js` starts
- **Server** generates its own key pair when `server.js` starts
- **No central authority** - keys are self-generated

### How Keys Are Generated

#### Step 1: JavaScript/TypeScript Layer (`test/client.js` or `test/server.js`)

```javascript
// Line 14 in client.js / Line 14 in server.js
const clientKeyPair = KeyPair.generate();
```

#### Step 2: Node.js SDK Layer (`irref-sdk/src/index.ts`)

```typescript
// Line 20-22
static generate(): KeyPair {
  return new KeyPair(new wasm.WasmKeyPair());
}
```

This calls the WebAssembly (WASM) module.

#### Step 3: WASM Bindings Layer (`irref-core/src/wasm.rs`)

```rust
// Line 15-20
#[wasm_bindgen(constructor)]
pub fn new() -> Self {
    Self {
        keypair: KeyPair::generate(),  // Calls Rust core
    }
}
```

#### Step 4: Rust Core Layer (`irref-core/src/crypto.rs`)

```rust
// Line 28-32
pub fn generate() -> Self {
    let mut csprng = OsRng;  // Operating System Random Number Generator
    let signing_key = SigningKey::generate(&mut csprng);
    Self { signing_key }
}
```

### Key Generation Details

**Algorithm:** Ed25519 (Edwards-curve Digital Signature Algorithm)

**Process:**
1. **Random Seed Generation**: Uses `OsRng` (Operating System Random Number Generator)
   - On Windows: Uses `BCryptGenRandom` or `CryptGenRandom`
   - On Linux: Uses `/dev/urandom`
   - On macOS: Uses `SecRandomCopyBytes`
   - This ensures cryptographically secure random numbers

2. **Key Pair Derivation**:
   - **Private Key**: 32 bytes of random data
   - **Public Key**: Derived from private key using Ed25519 curve mathematics
   - The public key is mathematically linked to the private key but cannot be reversed

3. **Key Storage**:
   - **Private Key**: Stored in memory only (never transmitted)
   - **Public Key**: Can be shared publicly (32 bytes, base64 or hex encoded)

### Key Structure

```
Private Key (32 bytes):
┌─────────────────────────────────┐
│  Random 32-byte seed            │
│  (Never shared, kept secret)     │
└─────────────────────────────────┘

Public Key (32 bytes):
┌─────────────────────────────────┐
│  Derived from private key        │
│  (Can be shared publicly)        │
└─────────────────────────────────┘
```

---

## 2. Message Signing Process

### Where Signing Happens

**Signing occurs on the sender's side** (client or server) before sending the message.

### Step-by-Step Signing Process

#### Step 1: Create Unsigned Message (`test/client.js`)

```javascript
// Line 75-79
const message = Message.create(
    payload,                    // "Hello from client!"
    clientPublicKey,            // Client's public key (32 bytes)
    previousMessageHash         // Optional: hash of previous message
);
```

#### Step 2: Message Structure Created (`irref-core/src/message.rs`)

The `MessageBuilder` creates a message with:
- `protocol_version`: 1
- `statement_id`: Auto-generated UUID
- `timestamp`: Current Unix timestamp
- `sender_public_key`: Client's public key
- `previous_message_hash`: Optional (for chaining)
- `payload`: The actual data
- `payload_hash`: SHA-256 hash of payload
- `signature`: **None yet** (will be added)

#### Step 3: Compute Message Hash (`irref-core/src/message.rs`)

```rust
// Line 200-203
pub fn compute_hash(&self) -> Vec<u8> {
    let serialized = self.serialize_for_signing().unwrap();
    compute_hash(&serialized)
}
```

**What gets hashed:**
1. Serialize message to **Canonical CBOR** (without signature)
2. Compute **SHA-256** hash of the serialized bytes
3. Result: 32-byte hash

**Important:** The signature field is **excluded** from hashing!

#### Step 4: Sign the Hash (`irref-core/src/crypto.rs`)

```rust
// Line 56-71
pub fn sign_message(&self, message: &Message) -> IrrefResult<Message> {
    let mut signed_message = message.clone();
    
    // Compute hash of message (without signature)
    let message_hash = signed_message.compute_hash();
    
    // Sign the hash using Ed25519
    let signature_bytes = self.signing_key.sign(&message_hash);
    
    // Attach signature to message
    signed_message.set_signature(signature_bytes.to_bytes().to_vec());
    
    Ok(signed_message)
}
```

**Ed25519 Signing Process:**
1. Takes the 32-byte message hash
2. Uses the 32-byte private key
3. Performs Ed25519 signature algorithm
4. Produces a 64-byte signature

**Signature Structure:**
```
┌─────────────────────────────────────────┐
│  R (32 bytes) - Random point on curve  │
│  S (32 bytes) - Scalar signature value │
└─────────────────────────────────────────┘
Total: 64 bytes
```

#### Step 5: Final Message Structure

```
Message (with signature):
┌─────────────────────────────────────┐
│ protocol_version: 1                │
│ statement_id: "irref-..."           │
│ timestamp: 1766449725                │
│ sender_public_key: [32 bytes]        │
│ previous_message_hash: [32 bytes]   │  (optional)
│ payload: "Hello from client!"        │
│ payload_hash: [32 bytes]            │
│ signature: [64 bytes] ← ADDED HERE  │
└─────────────────────────────────────┘
```

---

## 3. Message Verification Process

### Where Verification Happens

**Verification happens on the receiver's side** (server receives client messages, client receives server responses).

### Step-by-Step Verification Process

#### Step 1: Receive Message (`test/server.js`)

```javascript
// Line 73
const receivedMessage = Message.fromBytes(new Uint8Array(messageBytes));
```

The message is deserialized from Canonical CBOR format.

#### Step 2: Extract Components (`irref-core/src/crypto.rs`)

```rust
// Line 92-111
pub fn verify_message(&self, message: &Message) -> IrrefResult<()> {
    // Extract signature from message
    let signature_bytes = message.signature()
        .ok_or_else(|| IrrefError::MissingField("signature".to_string()))?;
    
    // Convert signature bytes to Ed25519 Signature type
    let signature = Signature::from_bytes(&signature_array);
    
    // Compute hash of message (same as signing process)
    let message_hash = message.compute_hash();
    
    // Verify using Ed25519
    self.verifying_key
        .verify(&message_hash, &signature)
        .map_err(|e| IrrefError::VerificationFailed(...))?;
    
    Ok(())
}
```

#### Step 3: Verification Algorithm

**Ed25519 Verification Process:**

1. **Extract Public Key**: From `message.sender_public_key` (32 bytes)

2. **Recompute Message Hash**: 
   - Serialize message to Canonical CBOR (without signature)
   - Compute SHA-256 hash
   - Must match exactly what was signed

3. **Ed25519 Verification**:
   ```
   Verify(signature, message_hash, public_key)
   ```
   - Uses elliptic curve mathematics
   - Checks if signature was created by private key corresponding to public key
   - Returns: ✅ Valid or ❌ Invalid

4. **Verification Result**:
   - ✅ **Valid**: Signature matches → Message is authentic
   - ❌ **Invalid**: Signature doesn't match → Message is tampered or forged

### What Verification Proves

✅ **Message Authenticity**: Message was signed by holder of private key  
✅ **Message Integrity**: Message was not modified after signing  
✅ **Non-Repudiation**: Sender cannot deny sending (only they have private key)

### What Verification Does NOT Prove

❌ **Message Freshness**: Doesn't prevent replay attacks (use timestamps)  
❌ **Sender Identity**: Only proves key ownership (use key management)

---

## 4. Hash Chaining

### Purpose

Hash chaining links messages together cryptographically, creating an immutable audit trail.

### How It Works

#### Step 1: First Message (No Chain)

```javascript
// First message has no previous hash
const message1 = Message.create(
    "Hello from client!",
    clientPublicKey,
    null  // No previous message
);
```

#### Step 2: Compute Hash of First Message

```javascript
const hash1 = message1.computeHashHex();
// Result: "4c49537555238c4bf846aa4e9b95729142f8eb5db3584a4211a70a2c578312e8"
```

#### Step 3: Second Message (Chained)

```javascript
// Second message includes hash of first message
const message2 = Message.create(
    "This is message #2",
    clientPublicKey,
    new Uint8Array(Buffer.from(hash1, 'hex'))  // Chain to message 1
);
```

#### Step 4: Chain Verification (`irref-core/src/message.rs`)

```rust
// Line 220-232
pub fn verify_chain(&self, previous_message: &Message) -> IrrefResult<()> {
    let prev_hash = self.previous_message_hash
        .as_ref()
        .ok_or_else(|| IrrefError::InvalidChain("No previous message hash".to_string()))?;
    
    let computed_prev_hash = previous_message.compute_hash();
    
    if prev_hash != &computed_prev_hash {
        return Err(IrrefError::InvalidChain(
            "Previous message hash mismatch".to_string()
        ));
    }
    
    Ok(())
}
```

### Chain Structure

```
Message 1:
┌─────────────────────────────┐
│ payload: "Hello"            │
│ previous_message_hash: null │
│ message_hash: H1            │
└─────────────────────────────┘
         │
         │ H1 is included in Message 2
         ▼
Message 2:
┌─────────────────────────────┐
│ payload: "Message #2"       │
│ previous_message_hash: H1   │ ← Links to Message 1
│ message_hash: H2             │
└─────────────────────────────┘
         │
         │ H2 is included in Message 3
         ▼
Message 3:
┌─────────────────────────────┐
│ payload: "Message #3"       │
│ previous_message_hash: H2   │ ← Links to Message 2
│ message_hash: H3             │
└─────────────────────────────┘
```

### Chain Verification Benefits

✅ **Tamper Detection**: If any message is modified, the chain breaks  
✅ **Order Verification**: Messages must be in correct order  
✅ **Audit Trail**: Complete history of all messages  
✅ **Immutable Log**: Cannot insert or delete messages without detection

---

## 5. Complete Flow: Client to Server

### Phase 1: Initialization

#### Client Side (`test/client.js`)

```javascript
// 1. Generate client key pair
const clientKeyPair = KeyPair.generate();
// → Calls: Rust core → Ed25519 key generation → OsRng

// 2. Get client public key
const clientPublicKey = clientKeyPair.publicKey();
// → Returns: 32-byte public key
```

#### Server Side (`test/server.js`)

```javascript
// 1. Generate server key pair
const serverKeyPair = KeyPair.generate();
// → Calls: Rust core → Ed25519 key generation → OsRng

// 2. Get server public key
const serverPublicKey = serverKeyPair.publicKey();
// → Returns: 32-byte public key
```

### Phase 2: Client Sends Message

#### Step 1: Create Message (`test/client.js`)

```javascript
const message = Message.create(
    "Hello from client!",
    clientPublicKey,
    null
);
```

**What happens internally:**
1. `MessageBuilder` creates message structure
2. Generates UUID for `statement_id`
3. Sets current timestamp
4. Computes `payload_hash` = SHA-256(payload)
5. Message is **unsigned** at this point

#### Step 2: Sign Message (`test/client.js`)

```javascript
const signedMessage = clientKeyPair.sign(message);
```

**What happens internally:**
1. Serialize message to Canonical CBOR (without signature)
2. Compute `message_hash` = SHA-256(serialized_message)
3. Sign hash: `signature` = Ed25519_Sign(message_hash, private_key)
4. Attach signature to message
5. Message is now **signed and ready**

#### Step 3: Serialize and Send (`test/client.js`)

```javascript
const messageBytes = signedMessage.toBytes();
// → Canonical CBOR serialization

// Send over HTTP
const postData = JSON.stringify({
    message: Buffer.from(messageBytes).toString('base64')
});
```

**Message Format:**
```
HTTP POST /message
Content-Type: application/json

{
  "message": "p2F2AWJpZHgfaXJyZWYt..."  // Base64 CBOR
}
```

### Phase 3: Server Receives and Verifies

#### Step 1: Deserialize Message (`test/server.js`)

```javascript
const messageBytes = Buffer.from(requestData.message, 'base64');
const receivedMessage = Message.fromBytes(new Uint8Array(messageBytes));
```

**What happens:**
1. Decode base64 → binary CBOR
2. Deserialize CBOR → Message structure
3. Extract all fields (payload, signature, public key, etc.)

#### Step 2: Verify Message (`test/server.js`)

```javascript
const verified = receivedMessage.verify();
```

**What happens internally (`irref-core/src/crypto.rs`):**

```rust
// 1. Extract sender's public key from message
let public_key = PublicKey::from_bytes(&message.sender_public_key)?;

// 2. Verify signature
public_key.verify_message(&message)?;
```

**Verification Steps:**
1. Extract `signature` (64 bytes) from message
2. Extract `sender_public_key` (32 bytes) from message
3. Recompute `message_hash`:
   - Serialize message to CBOR (without signature)
   - SHA-256 hash
4. Ed25519 verification:
   ```
   Ed25519_Verify(signature, message_hash, sender_public_key)
   ```
5. Result: ✅ Valid or ❌ Invalid

#### Step 3: Server Creates Response (`test/server.js`)

```javascript
const responseMessage = Message.create(
    JSON.stringify({
        received: receivedMessage.statementId(),
        verified: true,
        timestamp: new Date().toISOString()
    }),
    serverPublicKey,
    receivedMessage.computeHash()  // Chain to received message
);

const signedResponse = serverKeyPair.sign(responseMessage);
```

**What happens:**
1. Create new message with response payload
2. Chain to received message (include its hash)
3. Sign with server's private key
4. Serialize to CBOR

#### Step 4: Send Response (`test/server.js`)

```javascript
res.end(JSON.stringify({
    success: true,
    message: Buffer.from(responseBytes).toString('base64'),
    serverPublicKey: Buffer.from(serverPublicKey).toString('base64')
}));
```

### Phase 4: Client Verifies Response

#### Step 1: Receive Response (`test/client.js`)

```javascript
const responseMessage = Message.fromBytes(new Uint8Array(responseMessageBytes));
```

#### Step 2: Verify Server's Signature (`test/client.js`)

```javascript
const serverPublicKey = new Uint8Array(Buffer.from(response.serverPublicKey, 'base64'));
const verified = responseMessage.verifyWithPublicKey(serverPublicKey);
```

**What happens:**
1. Extract server's public key from response
2. Verify message signature using server's public key
3. Verify hash chain (if applicable)
4. Result: ✅ Valid or ❌ Invalid

---

## 6. Cryptographic Primitives

### Ed25519 Digital Signatures

**Algorithm:** Ed25519 (Edwards-curve Digital Signature Algorithm)

**Properties:**
- **Key Size**: 32 bytes (256 bits)
- **Signature Size**: 64 bytes (512 bits)
- **Security Level**: ~128 bits
- **Speed**: Very fast (designed for performance)
- **Curve**: Curve25519 (Montgomery curve)

**Mathematical Foundation:**
```
Private Key: k (32 bytes, random)
Public Key:  P = k * G  (where G is curve generator point)

Signing:
  r = hash(k || message_hash) mod q
  R = r * G
  s = (r + hash(R || P || message_hash) * k) mod q
  Signature = (R, s)  (64 bytes)

Verification:
  Check: s * G = R + hash(R || P || message_hash) * P
```

### SHA-256 Hashing

**Algorithm:** SHA-256 (Secure Hash Algorithm 256-bit)

**Properties:**
- **Output Size**: 32 bytes (256 bits)
- **Security Level**: 128 bits (collision resistance)
- **Deterministic**: Same input → same output
- **One-way**: Cannot reverse hash to get original data

**Usage in IRREF:**
1. **Payload Hash**: `SHA-256(payload)` → 32 bytes
2. **Message Hash**: `SHA-256(canonical_cbor_message)` → 32 bytes
3. **Hash Chaining**: Previous message hash → 32 bytes

### Canonical CBOR

**Format:** CBOR (Concise Binary Object Representation) in Canonical mode

**Properties:**
- **Deterministic**: Same data → same bytes (always)
- **Binary**: More compact than JSON
- **Self-describing**: Includes type information
- **Standard**: RFC 8949

**Why Canonical CBOR?**
- Ensures deterministic serialization
- Same message always produces same bytes
- Critical for signature verification
- Prevents signature bypass through format manipulation

**Example:**
```
Message:
{
  v: 1,
  id: "irref-123",
  ts: 1766449725,
  pk: [32 bytes],
  pl: "Hello",
  plh: [32 bytes],
  sig: [64 bytes]
}

CBOR Encoding:
a7 61 76 01 62 69 64 6c ... (binary)
```

---

## Summary: Who Does What

| Component | Responsibility |
|-----------|---------------|
| **Client/Server** | Generate their own key pairs independently |
| **Ed25519** | Provides key generation, signing, verification |
| **SHA-256** | Provides hashing for payloads and messages |
| **Canonical CBOR** | Provides deterministic serialization |
| **Sender** | Signs messages with their private key |
| **Receiver** | Verifies messages using sender's public key |
| **Rust Core** | Implements all cryptographic operations |
| **WASM** | Bridges Rust core to JavaScript |
| **Node.js SDK** | Provides clean JavaScript API |

---

## Security Guarantees

✅ **Non-Repudiation**: Sender cannot deny sending (only they have private key)  
✅ **Integrity**: Any tampering breaks signature verification  
✅ **Authenticity**: Message came from holder of private key  
✅ **Chain Integrity**: Hash chaining prevents message insertion/deletion  
✅ **Long-term Verifiability**: Messages remain verifiable indefinitely  
✅ **Transport Independence**: Works over any transport (HTTP, TCP, etc.)

---

This architecture ensures that IRREF provides **audit-grade cryptographic guarantees** for message-level non-repudiation and tamper-evident integrity.


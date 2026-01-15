# IRREF – Irrefutable Record Exchange Framework

**Making API messages cryptographic statements.**

IRREF is an application-layer protocol that provides message-level non-repudiation, tamper-evident integrity, and long-term verifiability for API communications.

## What is IRREF?

IRREF transforms every API message into a **cryptographic statement** that:

- ✅ **Cannot be repudiated**: The sender digitally signs each message and cannot deny sending it later
- ✅ **Detects tampering**: Hash chaining ensures any modification breaks the verification chain
- ✅ **Remains verifiable**: Messages are verifiable indefinitely, even after TLS sessions expire
- ✅ **Works anywhere**: Transport-independent (HTTP, WebSocket, gRPC, etc.)
- ✅ **Audit-grade**: Deterministic serialization and cryptographic signatures

## How IRREF Differs from Other Solutions

| Feature | HTTPS/TLS | JWT | OAuth | **IRREF** |
|---------|-----------|-----|-------|-----------|
| Transport security | ✅ | ❌ | ❌ | ✅ (works with TLS) |
| Message verification | ❌ | ✅ | ❌ | ✅ |
| Non-repudiation | ❌ | ❌ | ❌ | ✅ |
| Tamper detection | ❌ | ❌ | ❌ | ✅ |
| Long-term verifiability | ❌ | ✅ | ❌ | ✅ |
| Hash chaining | ❌ | ❌ | ❌ | ✅ |

**IRREF is not a replacement for TLS** - it works alongside it. TLS provides transport security, IRREF provides message-level guarantees.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │     IRREF SDKs        │
         │  (Node.js, Python,    │
         │   Java, Go, etc.)     │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    IRREF Core         │
         │    (Rust - WASM)      │
         │  Single source of     │
         │  cryptographic truth  │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    Transport Layer    │
         │  (HTTP, WebSocket,    │
         │   gRPC, etc.)         │
         └───────────────────────┘
```

**Core Principle**: All cryptographic operations happen in the Rust core library. SDKs are thin wrappers that call into the core via WebAssembly or native bindings. This ensures:

- Consistency across all languages
- Single source of truth for cryptographic operations
- Easier security auditing (one codebase to audit)

## Quick Start

### Node.js

```bash
cd irref-sdk
npm install
npm run build
npm run example
```

```typescript
import { KeyPair, Message } from 'irref-sdk';

// Generate keys
const alice = KeyPair.generate();

// Create and sign a message
const message = Message.create('Hello, IRREF!', alice.publicKey());
const signed = alice.sign(message);

// Verify
console.log('Verified:', signed.verify()); // true

// Serialize for transmission
const bytes = signed.toBytes();

// Deserialize and verify
const received = Message.fromBytes(bytes);
console.log('Still verified:', received.verify()); // true
```

### Rust

```bash
cd irref-core
cargo build
cargo test
```

```rust
use irref_core::{KeyPair, Message, MessageBuilder};

let keypair = KeyPair::generate();
let message = MessageBuilder::new()
    .payload(b"Hello, IRREF!".to_vec())
    .sender_public_key(keypair.public_key())
    .build()?;

let signed = keypair.sign_message(&message)?;
assert!(signed.verify().is_ok());
```

## Message Structure

An IRREF message is serialized as **canonical CBOR** (deterministic mode):

```rust
{
  v: 1,                    // Protocol version
  id: "uuid",              // Unique statement ID
  ts: 1234567890,          // UTC timestamp (epoch seconds)
  pk: [32 bytes],          // Sender's public key (Ed25519)
  prev: [32 bytes]?,       // Previous message hash (optional)
  pl: [bytes],             // Payload (opaque binary)
  plh: [32 bytes],         // Payload hash (SHA-256)
  sig: [64 bytes]          // Signature (Ed25519)
}
```

**Signature Process**:
1. Serialize message to canonical CBOR (without signature field)
2. Compute SHA-256 hash of the serialized message
3. Sign the hash with Ed25519 private key
4. Attach signature to message

**Verification Process**:
1. Extract signature from message
2. Serialize message to canonical CBOR (without signature field)
3. Compute SHA-256 hash
4. Verify signature using sender's public key

## Hash Chaining

Messages can be chained together using hashes:

```typescript
// First message
const msg1 = Message.create('First', alice.publicKey());
const signed1 = alice.sign(msg1);

// Second message (chained)
const hash1 = signed1.computeHash();
const msg2 = Message.create('Second', alice.publicKey(), hash1);
const signed2 = alice.sign(msg2);

// Verify chain
import { verifyChain } from 'irref-sdk';
console.log('Chain verified:', verifyChain([signed1, signed2])); // true
```

Any modification to a message in the chain will break verification of all subsequent messages.

## Use Cases

### Financial Instructions
- Payment orders
- Trade confirmations
- Settlement instructions
- **Non-repudiation is critical**: Parties cannot deny sending instructions

### Legal / Audit Trails
- Contract signatures
- Compliance reports
- Audit logs
- **Long-term verifiability**: Messages remain verifiable years later

### Inter-Service Communication
- Microservice APIs
- Event sourcing
- Message queues
- **Tamper detection**: Detect any unauthorized modifications

### API Security
- Replace or supplement JWT
- Add non-repudiation to REST APIs
- Secure webhook payloads
- **Transport independence**: Works with any transport protocol

## Security Guarantees

1. **Non-repudiation**: Only the holder of the private key can create a valid signature. The sender cannot deny sending the message.

2. **Integrity**: Any modification to the message (payload, timestamp, etc.) will break the signature verification.

3. **Tamper Detection**: Hash chaining ensures any modification to a message in the chain breaks verification of all subsequent messages.

4. **Deterministic Serialization**: The same logical message always produces the same bytes, preventing signature ambiguity.

5. **Long-term Verifiability**: Messages remain verifiable indefinitely using only the public key and the message itself.

## Cryptographic Choices

- **Signatures**: Ed25519 (preferred) or ECDSA P-256
- **Hashing**: SHA-256
- **Serialization**: Canonical CBOR (RFC 8949, deterministic mode)
- **Key Format**: Raw bytes (32 bytes for Ed25519 private, 32 bytes for public)

These are standard, well-audited cryptographic primitives. IRREF does not invent new cryptography.

## Project Structure

```
irref/
├── irref-core/          # Rust core library
│   ├── src/
│   │   ├── lib.rs       # Main library
│   │   ├── message.rs   # Message structure
│   │   ├── crypto.rs    # Cryptographic operations
│   │   ├── error.rs     # Error types
│   │   └── wasm.rs      # WebAssembly bindings
│   └── Cargo.toml
│
└── irref-sdk/           # Node.js SDK
    ├── src/
    │   ├── index.ts     # Main SDK
    │   └── example.ts   # Example usage
    └── package.json
```

## Building from Source

### Prerequisites

- Rust 1.70+ (install from [rustup.rs](https://rustup.rs))
- Node.js 18+ (for SDK)
- wasm-pack (for WASM builds): `cargo install wasm-pack`

### Build Core Library

```bash
cd irref-core
cargo build --release
```

### Build Node.js SDK

```bash
cd irref-sdk
npm install
npm run build
```

## Testing

### Core Library

```bash
cd irref-core
cargo test
```

### Node.js SDK

```bash
cd irref-sdk
npm test
npm run example
```

## Contributing

IRREF is designed to become a standard protocol. Contributions are welcome, but note:

1. **Cryptographic operations must remain in Rust core**
2. **SDKs must wrap the core, not reimplement logic**
3. **All changes must maintain backward compatibility**
4. **Security audits are required for cryptographic changes**

## License

MIT OR Apache-2.0

## Status

**Early Development** - This is a reference implementation. The protocol is designed to be standardized.

## FAQ

### Why not just use TLS?

TLS provides transport security but doesn't provide:
- Non-repudiation (the sender can deny sending)
- Long-term verifiability (after session ends)
- Message-level integrity (independent of transport)

IRREF works **with** TLS, not instead of it.

### Why not JWT?

JWT provides message verification but:
- No non-repudiation (anyone with the secret can create tokens)
- No hash chaining
- Not designed for audit trails

### Why CBOR instead of JSON?

- Deterministic serialization (same message = same bytes)
- More compact
- Better binary data support
- Standard (RFC 8949)

### Can I use this in production?

This is early-stage software. Use at your own risk. Security audits are recommended before production use.

### How do I manage keys?

IRREF doesn't prescribe key management. Use standard practices:
- Hardware Security Modules (HSMs)
- Key rotation policies
- Secure key storage
- Key escrow for compliance

## Contact

For questions, issues, or contributions, please open an issue on the repository.

---

**IRREF** - Making API messages cryptographic statements.


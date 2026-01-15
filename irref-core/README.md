# IRREF Core - Rust Library

**IRREF (Irrefutable Record Exchange Framework)** - Core cryptographic library providing message-level non-repudiation, tamper-evident integrity, and long-term verifiability.

## Overview

IRREF is an application-layer protocol that provides:

- **Message-level non-repudiation**: Every message is digitally signed using Ed25519
- **Tamper-evident integrity**: Hash chaining ensures any modification breaks the chain
- **Long-term verifiability**: Messages remain verifiable even after TLS sessions expire
- **Transport independence**: Works over HTTP/1.1, HTTP/2, WebSockets, or any transport
- **Audit-grade guarantees**: Deterministic serialization and cryptographic signatures

## What IRREF Solves

### The Problem

Traditional API security relies on:
- **TLS/HTTPS**: Provides transport security but messages aren't verifiable after the session ends
- **JWT**: Tokens can be verified, but they're stateless and don't provide non-repudiation
- **OAuth**: Authentication, not message integrity

None of these provide **non-repudiation** - the ability to prove that a specific party sent a specific message and cannot deny it later.

### The Solution

IRREF makes every API message a **cryptographic statement**:
- The sender signs each message with their private key
- Anyone can verify using the sender's public key
- The sender cannot deny sending the message (non-repudiation)
- Messages are chained via hashes, detecting any tampering
- Messages remain verifiable indefinitely

## Architecture

```
┌─────────────────┐
│  Application    │
└────────┬────────┘
         │
┌────────▼────────┐
│   IRREF SDK     │  (Node.js, Python, etc.)
└────────┬────────┘
         │
┌────────▼────────┐
│  IRREF Core    │  (Rust - Single Source of Truth)
└────────┬────────┘
         │
┌────────▼────────┐
│  Transport      │  (HTTP, WebSocket, etc.)
└─────────────────┘
```

**Key Principle**: All cryptographic operations happen in the Rust core. SDKs are thin wrappers that call into the core via WebAssembly or native bindings.

## Message Structure

An IRREF message contains:

```rust
{
  v: 1,                          // Protocol version
  id: "uuid",                    // Unique statement ID
  ts: 1234567890,                // UTC timestamp
  pk: [32 bytes],                // Sender's public key (Ed25519)
  prev: [32 bytes]?,             // Previous message hash (optional)
  pl: [bytes],                   // Payload (opaque binary)
  plh: [32 bytes],               // Payload hash (SHA-256)
  sig: [64 bytes]                // Signature (Ed25519)
}
```

**Serialization**: Canonical CBOR (RFC 8949, deterministic mode)

**Signature**: `Ed25519(sign(hash(canonical_cbor(message_without_sig))))`

## Usage

### Basic Example

```rust
use irref_core::{KeyPair, Message, MessageBuilder};

// Generate a key pair
let keypair = KeyPair::generate();

// Create a message
let message = MessageBuilder::new()
    .payload(b"Hello, IRREF!".to_vec())
    .sender_public_key(keypair.public_key())
    .build()?;

// Sign the message
let signed = keypair.sign_message(&message)?;

// Verify
assert!(signed.verify().is_ok());

// Serialize for transmission
let bytes = signed.serialize()?;

// Deserialize and verify
let received = Message::deserialize(&bytes)?;
assert!(received.verify().is_ok());
```

### Hash Chaining

```rust
// First message
let msg1 = MessageBuilder::new()
    .payload(b"First".to_vec())
    .sender_public_key(keypair.public_key())
    .build()?;
let signed1 = keypair.sign_message(&msg1)?;

// Second message (chained)
let hash1 = signed1.compute_hash();
let msg2 = MessageBuilder::new()
    .payload(b"Second".to_vec())
    .sender_public_key(keypair.public_key())
    .previous_message_hash(hash1)
    .build()?;
let signed2 = keypair.sign_message(&msg2)?;

// Verify chain
assert!(signed2.verify_chain(&signed1).is_ok());
```

## Building

### Standard Build

```bash
cargo build --release
```

### WebAssembly Build

```bash
# Install wasm-pack if needed
cargo install wasm-pack

# Build for Node.js
wasm-pack build --target nodejs

# Build for browser
wasm-pack build --target web
```

## Testing

```bash
cargo test
```

## Dependencies

- **ciborium**: Canonical CBOR encoding/decoding
- **ed25519-dalek**: Ed25519 signatures
- **sha2**: SHA-256 hashing
- **serde**: Serialization framework

## Security Considerations

1. **Private Keys**: Never expose private keys. Store them securely.
2. **Key Management**: Use proper key management practices (HSMs, key rotation, etc.)
3. **Timestamps**: Use synchronized clocks for accurate timestamps
4. **Randomness**: Key generation uses cryptographically secure random number generation

## Protocol Versioning

The protocol version field allows for future protocol evolution while maintaining backward compatibility.

## License

MIT OR Apache-2.0

## Contributing

This is a reference implementation. All cryptographic operations must remain in the Rust core to ensure consistency across all SDKs.


# IRREF Project Summary

## What Was Created

This project implements **IRREF (Irrefutable Record Exchange Framework)**, a protocol for message-level non-repudiation, tamper-evident integrity, and long-term verifiability.

## Project Structure

### irref-core/ (Rust Core Library)

**Purpose**: Single source of truth for all cryptographic operations

**Key Files**:
- `src/lib.rs` - Main library entry point
- `src/message.rs` - Message structure and serialization (canonical CBOR)
- `src/crypto.rs` - Ed25519 key pair and signing operations
- `src/error.rs` - Error types
- `src/wasm.rs` - WebAssembly bindings for Node.js SDK
- `examples/basic_usage.rs` - Basic usage example
- `examples/tamper_detection.rs` - Tamper detection demonstration

**Features**:
- ✅ Canonical CBOR serialization (deterministic)
- ✅ Ed25519 digital signatures
- ✅ SHA-256 hashing
- ✅ Hash chaining for tamper detection
- ✅ Message verification
- ✅ WebAssembly support

### irref-sdk/ (Node.js SDK)

**Purpose**: Clean JavaScript/TypeScript API wrapping the Rust core

**Key Files**:
- `src/index.ts` - Main SDK API (KeyPair, Message, Receipt, etc.)
- `src/example.ts` - Complete usage example
- `src/test.ts` - Test suite

**Features**:
- ✅ TypeScript support
- ✅ WASM bindings to Rust core
- ✅ Simple, intuitive API
- ✅ No reimplementation of cryptography

## Cryptographic Guarantees

1. **Non-repudiation**: Only the holder of the private key can create valid signatures
2. **Integrity**: Any modification breaks signature verification
3. **Tamper Detection**: Hash chaining detects modifications across message history
4. **Deterministic**: Same message always produces same bytes
5. **Long-term Verifiability**: Messages remain verifiable indefinitely

## Technology Stack

- **Core Language**: Rust 1.92.0
- **Serialization**: Canonical CBOR (RFC 8949)
- **Signatures**: Ed25519
- **Hashing**: SHA-256
- **WASM**: wasm-pack for Node.js bindings
- **SDK Language**: TypeScript/JavaScript

## Message Structure

```rust
{
  v: 1,                    // Protocol version
  id: "uuid",              // Unique statement ID
  ts: 1234567890,          // UTC timestamp
  pk: [32 bytes],          // Sender's public key
  prev: [32 bytes]?,       // Previous message hash (optional)
  pl: [bytes],             // Payload
  plh: [32 bytes],         // Payload hash
  sig: [64 bytes]          // Signature
}
```

## Build Status

✅ **Rust Core**: Ready to build
✅ **WASM Bindings**: Configured
✅ **Node.js SDK**: Ready to build (after WASM build)
✅ **Examples**: Complete
✅ **Documentation**: Complete

## Next Steps

1. **Build Rust Core**:
   ```bash
   cd irref-core
   cargo build --release
   cargo test
   ```

2. **Build WASM Module**:
   ```bash
   cd irref-core
   wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
   ```

3. **Build Node.js SDK**:
   ```bash
   cd irref-sdk
   npm install
   npm run build
   ```

4. **Run Examples**:
   ```bash
   # Rust examples
   cd irref-core
   cargo run --example basic_usage
   cargo run --example tamper_detection
   
   # Node.js examples
   cd irref-sdk
   npm run example
   ```

## Key Design Decisions

1. **Rust as Core**: All cryptography in Rust ensures consistency and security
2. **WASM for SDKs**: SDKs wrap the core via WebAssembly, not reimplementations
3. **Canonical CBOR**: Deterministic serialization prevents signature ambiguity
4. **Ed25519**: Modern, fast, secure signature algorithm
5. **Hash Chaining**: Optional but powerful feature for audit trails

## Compliance with Requirements

✅ Message-level non-repudiation
✅ Tamper-evident integrity
✅ Long-term verifiability
✅ Transport independence
✅ Audit-grade cryptographic guarantees
✅ Deterministic serialization
✅ Hash chaining
✅ Language neutrality (Rust core, WASM bindings)
✅ No new cryptography invented
✅ Standard, audited crypto libraries

## Documentation

- `README.md` - Main project documentation
- `irref-core/README.md` - Core library documentation
- `irref-sdk/README.md` - Node.js SDK documentation
- `BUILD.md` - Build instructions
- `QUICKSTART.md` - Quick start guide

## License

MIT OR Apache-2.0

---

**Status**: Implementation complete, ready for testing and refinement.


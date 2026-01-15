# IRREF Quick Start Guide

## Overview

IRREF (Irrefutable Record Exchange Framework) provides message-level non-repudiation, tamper-evident integrity, and long-term verifiability for API communications.

## Project Structure

```
IRREF – Irrefutable Record Exchange Framework/
├── irref-core/          # Rust core library
│   ├── src/             # Source code
│   ├── examples/        # Example programs
│   └── Cargo.toml       # Rust dependencies
│
└── irref-sdk/           # Node.js SDK
    ├── src/             # TypeScript source
    └── package.json     # Node.js dependencies
```

## Quick Start - Rust Core

### 1. Build the Core Library

```bash
cd irref-core
cargo build --release
```

### 2. Run Examples

```bash
# Basic usage example
cargo run --example basic_usage

# Tamper detection example
cargo run --example tamper_detection
```

### 3. Run Tests

```bash
cargo test
```

## Quick Start - Node.js SDK

### 1. Install Dependencies

First, you need to build the WASM module:

```bash
# Install wasm-pack if needed
cargo install wasm-pack

# Build WASM module
cd irref-core
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
```

### 2. Build the SDK

```bash
cd irref-sdk
npm install
npm run build
```

### 3. Run Examples

```bash
npm run example
npm test
```

## Basic Usage Example

### Rust

```rust
use irref_core::{KeyPair, Message, MessageBuilder};

// Generate key pair
let keypair = KeyPair::generate();

// Create and sign message
let message = MessageBuilder::new()
    .payload(b"Hello, IRREF!".to_vec())
    .sender_public_key(keypair.public_key())
    .build()?;

let signed = keypair.sign_message(&message)?;

// Verify
assert!(signed.verify().is_ok());
```

### TypeScript/JavaScript

```typescript
import { KeyPair, Message } from 'irref-sdk';

// Generate key pair
const alice = KeyPair.generate();

// Create and sign message
const message = Message.create('Hello, IRREF!', alice.publicKey());
const signed = alice.sign(message);

// Verify
console.log('Verified:', signed.verify()); // true
```

## What IRREF Provides

1. **Non-repudiation**: Sender cannot deny sending the message
2. **Tamper detection**: Any modification breaks verification
3. **Hash chaining**: Messages can be chained together
4. **Long-term verifiability**: Messages remain verifiable indefinitely
5. **Transport independence**: Works with any transport protocol

## Next Steps

- Read the main [README.md](README.md) for detailed documentation
- Check [BUILD.md](BUILD.md) for build instructions
- Explore the examples in `irref-core/examples/` and `irref-sdk/src/`

## Troubleshooting

### Rust not found

Install Rust from [rustup.rs](https://rustup.rs)

### wasm-pack not found

Install with: `cargo install wasm-pack`

### Node.js SDK build fails

Ensure you've built the WASM module first:
```bash
cd irref-core
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
```

## License

MIT OR Apache-2.0


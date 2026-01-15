# Building IRREF

This document provides instructions for building IRREF from source.

## Prerequisites

### Required

- **Rust 1.70+**: Install from [rustup.rs](https://rustup.rs)
- **Node.js 18+**: Install from [nodejs.org](https://nodejs.org)

### Optional (for WASM builds)

- **wasm-pack**: Install with `cargo install wasm-pack`

## Building the Core Library

### Standard Build

```bash
cd irref-core
cargo build --release
```

The library will be built in `target/release/`.

### Running Tests

```bash
cd irref-core
cargo test
```

### Running Examples

```bash
cd irref-core
cargo run --example basic_usage
cargo run --example tamper_detection
```

## Building the Node.js SDK

### Step 1: Build WASM Module

First, build the WebAssembly module from the Rust core:

```bash
cd irref-core
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
```

This will create the WASM bindings in `irref-sdk/pkg/`.

### Step 2: Build TypeScript

```bash
cd irref-sdk
npm install
npm run build:ts
```

Or build everything at once:

```bash
cd irref-sdk
npm run build
```

### Running SDK Tests

```bash
cd irref-sdk
npm test
```

### Running SDK Examples

```bash
cd irref-sdk
npm run example
```

## Complete Build Process

To build everything from scratch:

```bash
# 1. Build Rust core library
cd irref-core
cargo build --release
cargo test

# 2. Build WASM module
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg

# 3. Build Node.js SDK
cd ../irref-sdk
npm install
npm run build

# 4. Run tests
npm test
npm run example
```

## Troubleshooting

### WASM Build Fails

If `wasm-pack build` fails:

1. Ensure `wasm-pack` is installed: `cargo install wasm-pack`
2. Ensure you're using the latest Rust: `rustup update`
3. Try cleaning: `cargo clean` then rebuild

### TypeScript Compilation Errors

If TypeScript compilation fails:

1. Ensure Node.js 18+ is installed
2. Delete `node_modules` and `dist` folders
3. Run `npm install` again
4. Check that the WASM module was built in `pkg/`

### Missing WASM Module

If you see errors about missing WASM module:

1. Ensure you've run `wasm-pack build` in `irref-core/`
2. Check that `irref-sdk/pkg/` exists and contains `.wasm` files
3. Rebuild: `npm run build:wasm`

## Development

For development, you can use:

```bash
# Watch mode for TypeScript (requires ts-node-dev or similar)
npm run build:ts -- --watch

# Run tests in watch mode
cargo watch -x test
```

## Production Builds

For production:

1. Use `--release` flag for Rust builds
2. Ensure all optimizations are enabled
3. Test thoroughly before deployment


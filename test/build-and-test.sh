#!/bin/bash
# Build and test script for IRREF

set -e

echo "=== Building IRREF ==="
echo ""

# Build Rust core
echo "1. Building Rust core library..."
cd ../irref-core
cargo build --release
cargo test
echo "✓ Rust core built and tested"
echo ""

# Build WASM
echo "2. Building WASM module..."
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    cargo install wasm-pack
fi

wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
echo "✓ WASM module built"
echo ""

# Build Node.js SDK
echo "3. Building Node.js SDK..."
cd ../irref-sdk
npm install
npm run build:ts
echo "✓ Node.js SDK built"
echo ""

echo "=== Build Complete ==="
echo ""
echo "To test:"
echo "  1. In one terminal: node test/server.js"
echo "  2. In another terminal: node test/client.js"


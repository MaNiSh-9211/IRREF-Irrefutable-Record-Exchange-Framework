# IRREF Test Instructions

This document provides step-by-step instructions to build and test the IRREF implementation with a working client and server.

## Prerequisites

1. **Rust 1.70+** - Install from [rustup.rs](https://rustup.rs)
2. **Node.js 18+** - Install from [nodejs.org](https://nodejs.org)
3. **wasm-pack** - Install with: `cargo install wasm-pack`

## Step-by-Step Build and Test

### Step 1: Build Rust Core Library

Open a terminal in the project root and run:

```bash
cd irref-core
cargo build --release
cargo test
```

Expected output: Build succeeds, all tests pass.

### Step 2: Build WASM Module

Still in `irref-core` directory:

```bash
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
```

Expected output: WASM module built in `irref-sdk/pkg/`

### Step 3: Build Node.js SDK

```bash
cd ../irref-sdk
npm install
npm run build:ts
```

Expected output: TypeScript compiled to `dist/` directory

### Step 4: Test Client and Server

**Terminal 1 - Start Server:**

```bash
cd test
node server.js
```

Expected output:
```
=== IRREF Test Server ===

Server public key: abc123...
Server listening on http://localhost:3000
Endpoints:
  POST /message - Send IRREF message
  GET  /public-key - Get server public key
```

**Terminal 2 - Run Client:**

```bash
cd test
node client.js
```

Expected output:
```
=== IRREF Test Client ===

Client public key: def456...

1. Getting server public key...
   ✓ Server public key received

2. Test 1: Sending simple message...
Sending message:
  Statement ID: uuid-here
  Payload: Hello from client! This is test message #1
  Message hash: ghi789...
  ✓ Message sent and verified by server

Server response:
  Statement ID: server-uuid
  Payload: {"received":"uuid-here","verified":true,...}
  ✓ Server response verified

3. Test 2: Sending chained message...
...

=== All Tests Passed ===
```

## What the Test Verifies

1. ✅ **Key Generation**: Client and server can generate Ed25519 key pairs
2. ✅ **Message Creation**: Messages can be created with payloads
3. ✅ **Message Signing**: Messages can be signed with private keys
4. ✅ **Message Serialization**: Messages can be serialized to CBOR
5. ✅ **Message Transmission**: Messages can be sent over HTTP
6. ✅ **Message Deserialization**: Messages can be deserialized from CBOR
7. ✅ **Signature Verification**: Message signatures can be verified
8. ✅ **Hash Chaining**: Messages can be chained together
9. ✅ **Bidirectional Communication**: Both client and server can send/verify messages

## Troubleshooting

### Error: "Cannot find module '../irref-sdk/dist/index'"

**Solution**: Build the SDK first:
```bash
cd irref-sdk
npm run build
```

### Error: "wasm-pack not found"

**Solution**: Install wasm-pack:
```bash
cargo install wasm-pack
```

### Error: "Cannot find module '../pkg/irref_core'"

**Solution**: Build the WASM module:
```bash
cd irref-core
wasm-pack build --target nodejs --out-dir ../irref-sdk/pkg
```

### Error: Rust compilation fails

**Solution**: 
1. Ensure Rust is installed: `rustc --version`
2. Update Rust: `rustup update`
3. Check for missing dependencies in `Cargo.toml`

### Error: Port 3000 already in use

**Solution**: Change the port in `test/server.js` and `test/client.js`

### Error: "Signature verification failed"

**Possible causes**:
- Message was tampered with during transmission
- Wrong public key used for verification
- Message not properly signed

**Solution**: Check that:
1. Message is properly signed before sending
2. Correct public key is used for verification
3. Message bytes are not modified during serialization/deserialization

## Automated Build Script

You can use the provided build script:

**Windows (PowerShell):**
```powershell
cd test
.\build-and-test.ps1
```

**Linux/Mac:**
```bash
cd test
chmod +x build-and-test.sh
./build-and-test.sh
```

## Manual Verification Checklist

- [ ] Rust core compiles without errors
- [ ] Rust tests pass
- [ ] WASM module builds successfully
- [ ] Node.js SDK compiles TypeScript
- [ ] Server starts and listens on port 3000
- [ ] Client can connect to server
- [ ] Client can send signed messages
- [ ] Server can verify client messages
- [ ] Server can send signed responses
- [ ] Client can verify server responses
- [ ] Hash chaining works correctly
- [ ] Multiple messages can be sent in sequence

## Next Steps

Once all tests pass:

1. Review the code in `test/client.js` and `test/server.js`
2. Modify the test to add more scenarios
3. Test with different payload sizes
4. Test with binary payloads
5. Test error cases (tampered messages, invalid signatures, etc.)

## Support

If you encounter issues not covered here, check:
- `irref-core/README.md` - Core library documentation
- `irref-sdk/README.md` - SDK documentation
- `BUILD.md` - Build instructions
- `README.md` - Main project documentation


# IRREF Testing Guide - Step by Step Instructions

This guide provides exact commands to test the IRREF implementation.

## Prerequisites Check

First, verify you have everything installed:

```powershell
# Check Rust
rustc --version
cargo --version

# Check Node.js
node --version
npm --version

# Check wasm-pack (if not installed, run: cargo install wasm-pack)
wasm-pack --version
```

## Step 1: Build Everything

Open **Terminal 1** (PowerShell) and run:

```powershell
# Navigate to project root
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"

# Build Rust core library
cd irref-core
cargo build --release
cargo test

# Build WASM module
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg

# Build Node.js SDK
cd ..\irref-sdk
npm install
npm run build:ts
```

**Expected output**: All builds should complete without errors.

## Step 2: Start the Server

Open **Terminal 2** (PowerShell) - **NEW TERMINAL**:

```powershell
# Navigate to project root
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"

# Kill any existing processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# Start the server
cd test
node server.js
```

**Expected output**:
```
=== IRREF Test Server ===

Server public key: abc123...
Server listening on http://localhost:3000
Endpoints:
  POST /message - Send IRREF message
  GET  /public-key - Get server public key
```

**Keep this terminal open** - the server will keep running.

## Step 3: Run the Client Test

Open **Terminal 3** (PowerShell) - **NEW TERMINAL**:

```powershell
# Navigate to project root
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"

# Run the client test
cd test
node client.js
```

**Expected output**:
```
=== IRREF Test Client ===

Client public key: def456...

1. Getting server public key...
   ✓ Server public key received

2. Test 1: Sending simple message...
Sending message:
  Statement ID: irref-...
  Payload: Hello from client! This is test message #1
  Message hash: ...
  ✓ Message sent and verified by server

Server response:
  Statement ID: irref-...
  Payload: {"received":"...","verified":true,"timestamp":"..."}
  ✓ Server response verified

3. Test 2: Sending chained message...
...

=== All Tests Passed ===
```

## Step 4: Verify Server Logs

Check **Terminal 2** (where the server is running). You should see:

```
[2025-12-23T...] Received message:
  Statement ID: irref-...
  Payload: Hello from client! This is test message #1
  Sender public key: ...
  ✓ Message verified successfully
  ✓ Response message created and signed
```

## Quick Test Script (All-in-One)

If you want to test everything in one go, use this script:

**Terminal 1** (PowerShell):

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"

# Kill any existing processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# Start server in background
cd test
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js"

# Wait for server to start
Start-Sleep -Seconds 3

# Run client test
node client.js

# The server window will stay open - you can close it manually or:
# Get-Process | Where-Object {$_.MainWindowTitle -like '*server*'} | Stop-Process
```

## Testing Individual Components

### Test Rust Core Library Only

**Terminal 1**:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-core"
cargo test
cargo run --example basic_usage
cargo run --example tamper_detection
```

### Test Node.js SDK Only

**Terminal 1**:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-sdk"
npm test
npm run example
```

## Troubleshooting

### Port 3000 Already in Use

```powershell
# Kill processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### Server Won't Start

1. Check if port 3000 is free: `netstat -ano | findstr :3000`
2. Kill the process: `taskkill /PID <process_id> /F`
3. Try a different port by editing `test/server.js` and `test/client.js`

### WASM Module Not Found

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-core"
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
```

### TypeScript Errors

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-sdk"
npm run build:ts
```

## What Each Test Verifies

1. **Key Generation**: Ed25519 key pairs are generated correctly
2. **Message Creation**: Messages can be created with payloads
3. **Message Signing**: Messages are signed with private keys
4. **Serialization**: Messages are serialized to CBOR
5. **Transmission**: Messages are sent over HTTP
6. **Deserialization**: Messages are deserialized from CBOR
7. **Verification**: Message signatures are verified
8. **Hash Chaining**: Messages are chained together
9. **Bidirectional**: Both client and server can send/verify

## Success Criteria

✅ All tests should show checkmarks (✓)
✅ No error messages
✅ Server receives and verifies messages
✅ Client receives and verifies server responses
✅ Hash chaining works correctly

If all tests pass, IRREF is working correctly!


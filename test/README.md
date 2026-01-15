# IRREF Client/Server Test

This directory contains a working client and server implementation to test IRREF end-to-end.

## Files

- `server.js` - HTTP server that receives and verifies IRREF messages
- `client.js` - HTTP client that creates, signs, and sends IRREF messages
- `START_SERVER.ps1` - PowerShell script to start the server
- `RUN_CLIENT.ps1` - PowerShell script to run the client

## Quick Start (3 Terminals)

### Terminal 1: Build Everything (One-time setup)

```powershell
# Navigate to project root
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"

# Build Rust core
cd irref-core
cargo build --release

# Build WASM
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg

# Build Node.js SDK
cd ..\irref-sdk
npm install
npm run build:ts
```

### Terminal 2: Start the Server

```powershell
# Navigate to test directory
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"

# Run the server script (or just: node server.js)
.\START_SERVER.ps1
```

**Keep this terminal open** - the server will keep running.

### Terminal 3: Run the Client Test

```powershell
# Navigate to test directory
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"

# Run the client test
.\RUN_CLIENT.ps1
```

## Alternative: Manual Commands

### Step 1: Build the SDK

```powershell
cd ..\irref-sdk
npm install
npm run build
```

### Step 2: Start the Server

In one terminal:

```powershell
cd test
# Clear port 3000 first
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Start server
node server.js
```

The server will start on `http://localhost:3000`

### Step 3: Run the Client

In another terminal:

```powershell
cd test
node client.js
```

## What the Test Does

1. **Client** generates a key pair
2. **Client** gets the server's public key
3. **Client** creates and signs a message
4. **Client** sends the message to the server
5. **Server** receives and verifies the message
6. **Server** creates a signed response message (chained to the received message)
7. **Client** verifies the server's response
8. **Client** sends additional chained messages to test hash chaining

## Expected Output

### Server Output

```
=== IRREF Test Server ===

Server public key: abc123...
Server listening on http://localhost:3000
Endpoints:
  POST /message - Send IRREF message
  GET  /public-key - Get server public key

[2025-12-23T...] Received message:
  Statement ID: uuid-here
  Payload: Hello from client! This is test message #1
  Sender public key: def456...
  ✓ Message verified successfully
  ✓ Response message created and signed
```

### Client Output

```
=== IRREF Test Client ===

Client public key: ghi789...

1. Getting server public key...
   ✓ Server public key received

2. Test 1: Sending simple message...
Sending message:
  Statement ID: uuid-here
  Payload: Hello from client! This is test message #1
  Message hash: jkl012...
  ✓ Message sent and verified by server

Server response:
  Statement ID: server-uuid
  Payload: {"received":"uuid-here","verified":true,...}
  ✓ Server response verified

=== All Tests Passed ===
```

## Troubleshooting

### "Cannot find module '../irref-sdk/dist/index'"

Make sure you've built the SDK:
```bash
cd ../irref-sdk
npm run build
```

### "wasm-pack not found"

Install wasm-pack:
```bash
cargo install wasm-pack
```

Then rebuild:
```bash
cd ../irref-sdk
npm run build
```

### Port already in use

Change the port in `server.js` and `client.js` if port 3000 is already in use.


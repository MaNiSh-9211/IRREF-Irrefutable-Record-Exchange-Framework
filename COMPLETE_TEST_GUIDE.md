# Complete IRREF Testing Guide

## Overview

This guide shows you how to test IRREF end-to-end with full logging and verification.

## Quick Start (3 Terminals)

### Terminal 1: Build (One-time, if not already built)

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"
cd irref-core
cargo build --release
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
cd ..\irref-sdk
npm install
npm run build:ts
```

### Terminal 2: Start IRREF Server

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
node server.js
```

**Keep this terminal open!** You'll see detailed logs of all received messages.

### Terminal 3: Run Client Test

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node client.js
```

**All responses are automatically saved to `test/responses/` directory!**

## Verify Messages

### Option 1: Web Verifier (Easiest)

**Terminal 4** (new terminal):

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node verify-server.js
```

Then open in browser: **http://localhost:8080**

Upload a response file from `test/responses/` or paste message data to verify.

### Option 2: Check Logs

**Server logs**: `test/logs/server-<timestamp>.log`
- Contains all received messages with full details
- Shows verification results
- Shows response messages created

**Client logs**: `test/logs/client-<timestamp>.log`
- Contains all sent messages with full details
- Shows server responses
- Shows verification results

### Option 3: Response Files

**Response files**: `test/responses/response-<timestamp>-<statement-id>.json`

Each file contains:
- Complete request (message you sent)
- Complete response (message server sent back)
- HTTP headers and status
- All message details in hex and base64

## What You'll See

### In Terminal 2 (Server):

```
=== IRREF Test Server ===

[2025-12-23T...] Server starting...
[2025-12-23T...] Server public key (full): {...}
[2025-12-23T...] Log file: test\logs\server-1234567890.log

[2025-12-23T...] === INCOMING REQUEST ===
[2025-12-23T...] Request headers: {...}
[2025-12-23T...] Request body (raw): {...}
[2025-12-23T...] Message bytes (base64): {...}
[2025-12-23T...] === RECEIVED IRREF MESSAGE ===
[2025-12-23T...] Complete message details: {
  "statementId": "irref-...",
  "payload": "Hello from client!",
  "messageHash": "...",
  "signature": "...",
  ...
}
[2025-12-23T...] ✓ Message verified successfully
[2025-12-23T...] === RESPONSE MESSAGE CREATED ===
[2025-12-23T...] ✓ Response sent
```

### In Terminal 3 (Client):

```
=== IRREF Test Client ===

[2025-12-23T...] Client starting...
[2025-12-23T...] === SENDING IRREF MESSAGE ===
[2025-12-23T...] Message details: {...}
[2025-12-23T...] ✓ Message sent and verified by server
[2025-12-23T...] === SERVER RESPONSE MESSAGE ===
[2025-12-23T...] Server response details: {...}
[2025-12-23T...] ✓ Server response verified
[2025-12-23T...] ✓ Complete response saved to: test\responses\response-...
```

## Files Created

After running tests, you'll have:

1. **Server logs**: `test/logs/server-*.log`
   - Every message received
   - Complete message structure
   - Verification results

2. **Client logs**: `test/logs/client-*.log`
   - Every message sent
   - Server responses
   - Verification results

3. **Response files**: `test/responses/response-*.json`
   - Complete request/response pairs
   - Ready for verification
   - Can be shared publicly

## Public Verification

Anyone can verify your messages:

1. **Share the response file** - Contains everything needed
2. **Use the web verifier** - Upload the file at http://localhost:8080
3. **Or extract manually**:
   - Get `message` (base64) from response file
   - Get `serverPublicKey` (base64) from response file
   - Use IRREF SDK to verify

## Real-World Usage

This is a **real protocol implementation**:

- ✅ Real cryptographic signatures (Ed25519)
- ✅ Real message serialization (Canonical CBOR)
- ✅ Real HTTP communication
- ✅ Real verification (anyone can verify)
- ✅ Real non-repudiation (sender cannot deny)
- ✅ Real tamper detection (any modification breaks verification)

## Next Steps

1. **Implement your client** using the IRREF SDK
2. **Point to your server** (change SERVER_URL in client.js)
3. **Send real messages** - they'll be logged and saved
4. **Verify responses** using the web verifier
5. **Share response files** for public verification

## Troubleshooting

### Port 3000 in use:
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Port 8080 in use (verifier):
Change PORT in `verify-server.js` or kill the process:
```powershell
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### No response files created:
Check that `test/responses/` directory exists and is writable.

### Verification fails:
- Check that the message wasn't modified
- Verify the public key is correct
- Ensure the message is complete (all fields present)


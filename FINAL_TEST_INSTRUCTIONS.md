# Final IRREF Test Instructions

## ✅ Everything is Ready!

The IRREF implementation is complete with:
- ✅ Full logging (server and client)
- ✅ Response files saved automatically
- ✅ Web verifier for public verification
- ✅ Real cryptographic signatures (Ed25519)
- ✅ Real message serialization (Canonical CBOR)
- ✅ Real HTTP communication

## Quick Test (3 Terminals)

### Terminal 1: Build (if needed)
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"
cd irref-core
cargo build --release
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
cd ..\irref-sdk
npm install
npm run build:ts
```

### Terminal 2: Start Server
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
node server.js
```

**Keep this terminal open!** You'll see detailed logs of every message received.

### Terminal 3: Run Client
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node client.js
```

## What You'll Get

### 1. Response Files
All responses saved to: `test/responses/response-<timestamp>-<statement-id>.json`

Each file contains:
- Complete request (message you sent)
- Complete response (message server sent back)
- HTTP headers and status
- All message details in hex and base64

### 2. Server Logs
Saved to: `test/logs/server-<timestamp>.log`

Contains:
- Every message received
- Complete message structure (hex, base64)
- Verification results
- Response messages created

### 3. Client Logs
Saved to: `test/logs/client-<timestamp>.log`

Contains:
- Every message sent
- Complete message details
- Server responses
- Verification results

## Verify Messages Publicly

### Option 1: Web Verifier (Easiest)

**Terminal 4**:
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node verify-server.js
```

Then open: **http://localhost:8080**

Upload a response file from `test/responses/` to verify!

### Option 2: Share Response Files

Anyone can verify your messages by:
1. Getting the response file from `test/responses/`
2. Extracting the `message` (base64) and `serverPublicKey` (base64)
3. Using the IRREF SDK or web verifier to verify

## Real Protocol Features

✅ **Non-repudiation**: Messages are signed - sender cannot deny
✅ **Tamper detection**: Any modification breaks verification
✅ **Hash chaining**: Messages are cryptographically linked
✅ **Long-term verifiability**: Messages remain verifiable forever
✅ **Transport independent**: Works over any transport (HTTP, TCP, etc.)
✅ **Audit-grade**: Strong cryptography (Ed25519, SHA-256)

## Files Created

- `test/responses/*.json` - All request/response pairs
- `test/logs/server-*.log` - Server-side logs
- `test/logs/client-*.log` - Client-side logs

## Public Verification

To verify messages publicly:
1. Share the response file (contains everything)
2. Use the web verifier at http://localhost:8080
3. Or extract message + public key and verify with IRREF SDK

**This is a real protocol implementation - not simulated!**


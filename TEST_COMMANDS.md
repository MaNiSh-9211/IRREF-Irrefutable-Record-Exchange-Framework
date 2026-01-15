# IRREF Test Commands - Copy & Paste Ready

## Prerequisites (Run Once)

Open **PowerShell** and verify:

```powershell
rustc --version
cargo --version
node --version
npm --version
wasm-pack --version
```

## One-Time Build (Terminal 1)

Open **PowerShell Terminal 1** and run:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"
cd irref-core
cargo build --release
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
cd ..\irref-sdk
npm install
npm run build:ts
```

## Start Server (Terminal 2)

Open **NEW PowerShell Terminal 2** and run:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
node server.js
```

**Keep this terminal open!** The server will keep running.

## Run Client Test (Terminal 3)

Open **NEW PowerShell Terminal 3** and run:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node client.js
```

## Expected Results

### Terminal 2 (Server) should show:
```
=== IRREF Test Server ===

Server public key: ...
Server listening on http://localhost:3000
Endpoints:
  POST /message - Send IRREF message
  GET  /public-key - Get server public key

[2025-12-23T...] Received message:
  Statement ID: irref-...
  Payload: Hello from client! This is test message #1
  Sender public key: ...
  ✓ Message verified successfully
  ✓ Response message created and signed
```

### Terminal 3 (Client) should show:
```
=== IRREF Test Client ===

Client public key: ...

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

## Quick All-in-One Test

If you want to test everything in one terminal:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework"
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
cd test
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js"
Start-Sleep -Seconds 4
node client.js
```

## Troubleshooting

### Port 3000 in use:
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### Rebuild WASM:
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-core"
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
```

### Rebuild TypeScript:
```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\irref-sdk"
npm run build:ts
```


# How to Verify IRREF Messages

## Method 1: Using the Web Verifier (Recommended)

### Step 1: Start the Verification Server

Open a terminal and run:

```powershell
cd "C:\Users\at381\OneDrive\Desktop\IRREF – Irrefutable Record Exchange Framework\test"
node verify-server.js
```

### Step 2: Open in Browser

Open your web browser and go to:
```
http://localhost:8080
```

### Step 3: Verify Messages

You can verify messages in two ways:

**Option A: Upload Response File**
1. Click "Choose File"
2. Select a file from `test/responses/` directory
3. Click "Load File"
4. The verifier will automatically extract and verify the message

**Option B: Paste Message Data**
1. Copy the base64 message from your response file
2. Paste it into "Message (Base64 CBOR)" field
3. (Optional) Paste the public key if you want to verify with a specific key
4. Click "Verify Message"

## Method 2: Using Response Files

All responses are automatically saved to:
```
test/responses/response-<timestamp>-<statement-id>.json
```

Each file contains:
- Complete request details (message sent)
- Complete response details (message received)
- HTTP headers and status
- Timestamps

## Method 3: Check Logs

### Server Logs
```
test/logs/server-<timestamp>.log
```

Contains:
- All received messages
- Complete message details (hex, base64, etc.)
- Verification results
- Response messages created

### Client Logs
```
test/logs/client-<timestamp>.log
```

Contains:
- All sent messages
- Complete message details
- Server responses
- Verification results

## What Gets Logged

### Server Side:
- Raw HTTP request
- Message bytes (hex and base64)
- Complete message structure:
  - Protocol version
  - Statement ID
  - Timestamp
  - Sender public key
  - Previous message hash (if chained)
  - Payload
  - Payload hash
  - Message hash
  - Signature
- Verification result
- Response message details

### Client Side:
- Complete message details before sending
- HTTP request details
- Server response
- Verification result
- File path where response was saved

## Verification Process

1. **Message Structure**: The verifier checks that the message has all required fields
2. **Signature Verification**: Uses Ed25519 to verify the signature against the public key
3. **Hash Verification**: Verifies that the payload hash matches the actual payload
4. **Chain Verification**: (If applicable) Verifies that the previous message hash is correct

## Example Response File Structure

```json
{
  "request": {
    "message": {
      "statementId": "irref-...",
      "payload": "Hello from client!",
      "messageHash": "...",
      "signature": "..."
    },
    "httpRequest": {
      "method": "POST",
      "url": "http://localhost:3000/message",
      "headers": {...},
      "body": "..."
    }
  },
  "response": {
    "httpStatus": 200,
    "httpHeaders": {...},
    "body": {
      "success": true,
      "message": "<base64-cbor>",
      "serverPublicKey": "<base64>"
    },
    "rawBody": "..."
  },
  "timestamp": "2025-12-23T..."
}
```

## Public Verification

To verify messages publicly, you can:

1. Share the response file (it contains everything needed)
2. Share the base64 message and public key
3. Use the web verifier at `http://localhost:8080`
4. Anyone with the message and public key can verify it independently

## Security Notes

- Messages are cryptographically signed - anyone can verify them
- You don't need the private key to verify
- Verification is deterministic - same message always verifies the same way
- Messages remain verifiable indefinitely


/**
 * IRREF Test Server
 * 
 * HTTP server that receives, verifies, and responds to IRREF messages
 * All messages are logged in detail to log files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// Server key pair
const serverKeyPair = KeyPair.generate();
const serverPublicKey = serverKeyPair.publicKey();

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log file
const logFile = path.join(logsDir, `server-${Date.now()}.log`);

function log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(logFile, logEntry + '\n');
    if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        console.log(dataStr);
        fs.appendFileSync(logFile, dataStr + '\n');
    }
    fs.appendFileSync(logFile, '\n');
}

console.log('=== IRREF Test Server ===\n');
log('Server starting...');
log('Server public key (full):', { publicKey: Buffer.from(serverPublicKey).toString('hex') });
log('Server public key (base64):', { publicKeyBase64: Buffer.from(serverPublicKey).toString('base64') });
log(`Log file: ${logFile}\n`);

// Store for message history (for hash chaining)
const messageHistory = new Map();

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/message') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                // Log raw request
                log('=== INCOMING REQUEST ===');
                log('Request headers:', req.headers);
                log('Request body (raw):', { body: body });
                
                // Parse the request
                const requestData = JSON.parse(body);
                const messageBytes = Buffer.from(requestData.message, 'base64');
                
                // Log raw message bytes
                log('Message bytes (base64):', { messageBase64: requestData.message });
                log('Message bytes (hex):', { messageHex: messageBytes.toString('hex') });
                log('Message bytes (length):', { length: messageBytes.length });
                
                // Deserialize the IRREF message
                const receivedMessage = Message.fromBytes(new Uint8Array(messageBytes));
                
                // Log complete message details
                const messageHashHex = receivedMessage.computeHashHex();
                const messageDetails = {
                    statementId: receivedMessage.statementId(),
                    timestamp: receivedMessage.timestamp(),
                    timestampISO: new Date(receivedMessage.timestamp() * 1000).toISOString(),
                    senderPublicKey: Buffer.from(receivedMessage.senderPublicKey()).toString('hex'),
                    senderPublicKeyBase64: Buffer.from(receivedMessage.senderPublicKey()).toString('base64'),
                    previousMessageHash: receivedMessage.previousMessageHash() 
                        ? Buffer.from(receivedMessage.previousMessageHash()).toString('hex')
                        : null,
                    payload: receivedMessage.payloadString(),
                    payloadBytes: Array.from(receivedMessage.payload()).map(b => b.toString(16).padStart(2, '0')).join(''),
                    payloadHash: Buffer.from(receivedMessage.payloadHash()).toString('hex'),
                    messageHash: messageHashHex,
                    signature: 'N/A - signature is embedded in serialized message',
                    signatureBase64: 'N/A - signature is embedded in serialized message',
                    serializedMessage: Buffer.from(receivedMessage.toBytes()).toString('hex'),
                    serializedMessageBase64: Buffer.from(receivedMessage.toBytes()).toString('base64')
                };
                
                log('=== RECEIVED IRREF MESSAGE ===');
                log('Complete message details:', messageDetails);
                
                // Verify the message
                const verified = receivedMessage.verify();
                
                if (!verified) {
                    log('✗ VERIFICATION FAILED');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    const errorResponse = {
                        success: false,
                        error: 'Message verification failed',
                        timestamp: new Date().toISOString()
                    };
                    res.end(JSON.stringify(errorResponse));
                    log('Response sent:', errorResponse);
                    return;
                }
                
                log('✓ Message verified successfully');
                
                // Check hash chain if previous message hash exists
                if (receivedMessage.previousMessageHash()) {
                    const prevHash = Buffer.from(receivedMessage.previousMessageHash()).toString('hex');
                    const prevMessage = messageHistory.get(prevHash);
                    
                    if (prevMessage) {
                        log('✓ Hash chain verified');
                    } else {
                        log('⚠ Previous message not found in history');
                    }
                }
                
                // Store message in history
                const messageHash = receivedMessage.computeHashHex();
                messageHistory.set(messageHash, receivedMessage);
                
                // Create response message
                const responsePayload = JSON.stringify({
                    received: receivedMessage.statementId(),
                    verified: true,
                    timestamp: new Date().toISOString(),
                    messageHash: messageHash
                });
                
                const responseMessage = Message.create(
                    responsePayload,
                    serverPublicKey,
                    new Uint8Array(Buffer.from(messageHash, 'hex')) // Chain to received message
                );
                
                const signedResponse = serverKeyPair.sign(responseMessage);
                const responseBytes = signedResponse.toBytes();
                
                // Log response details
                const responseDetails = {
                    statementId: signedResponse.statementId(),
                    timestamp: signedResponse.timestamp(),
                    timestampISO: new Date(signedResponse.timestamp() * 1000).toISOString(),
                    payload: signedResponse.payloadString(),
                    messageHash: signedResponse.computeHashHex(),
                    previousMessageHash: Buffer.from(signedResponse.previousMessageHash()).toString('hex'),
                    signature: 'N/A - signature is embedded in serialized message',
                    signatureBase64: 'N/A - signature is embedded in serialized message',
                    responseBytesBase64: Buffer.from(responseBytes).toString('base64'),
                    responseBytesHex: Buffer.from(responseBytes).toString('hex')
                };
                
                log('=== RESPONSE MESSAGE CREATED ===');
                log('Response details:', responseDetails);
                
                // Send response
                const response = {
                    success: true,
                    message: Buffer.from(responseBytes).toString('base64'),
                    serverPublicKey: Buffer.from(serverPublicKey).toString('base64'),
                    timestamp: new Date().toISOString()
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
                
                log('✓ Response sent:', response);
                log('=== REQUEST COMPLETE ===\n');
                
            } catch (error) {
                log('✗ ERROR PROCESSING MESSAGE');
                log('Error message:', { error: error.message });
                log('Error stack:', { stack: error.stack });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                const errorResponse = {
                    success: false,
                    error: error.message || String(error),
                    timestamp: new Date().toISOString()
                };
                res.end(JSON.stringify(errorResponse));
                log('Error response sent:', errorResponse);
            }
        });
    } else if (req.method === 'GET' && req.url === '/public-key') {
        // Return server's public key
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            publicKey: Buffer.from(serverPublicKey).toString('base64')
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST /message - Send IRREF message');
    console.log('  GET  /public-key - Get server public key');
    console.log(`\nAll messages logged to: ${logFile}\n`);
});

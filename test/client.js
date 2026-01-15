/**
 * IRREF Test Client
 * 
 * HTTP client that creates, signs, and sends IRREF messages to the server
 * All responses are saved to files for verification
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// Client key pair
const clientKeyPair = KeyPair.generate();
const clientPublicKey = clientKeyPair.publicKey();

// Create responses directory
const responsesDir = path.join(__dirname, 'responses');
if (!fs.existsSync(responsesDir)) {
    fs.mkdirSync(responsesDir, { recursive: true });
}

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `client-${Date.now()}.log`);

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

console.log('=== IRREF Test Client ===\n');
log('Client starting...');
log('Client public key (full):', { publicKey: Buffer.from(clientPublicKey).toString('hex') });
log('Client public key (base64):', { publicKeyBase64: Buffer.from(clientPublicKey).toString('base64') });
log(`Log file: ${logFile}`);
log(`Responses directory: ${responsesDir}\n`);

const SERVER_URL = 'http://localhost:3000';

// Get server's public key
function getServerPublicKey() {
    return new Promise((resolve, reject) => {
        http.get(`${SERVER_URL}/public-key`, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const serverPublicKey = Buffer.from(json.publicKey, 'base64');
                    log('Server public key received:', { 
                        publicKey: serverPublicKey.toString('hex'),
                        publicKeyBase64: json.publicKey
                    });
                    resolve(new Uint8Array(serverPublicKey));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Send a message to the server
function sendMessage(payload, previousMessageHash = null) {
    return new Promise((resolve, reject) => {
        // Create and sign message
        const message = Message.create(
            payload,
            clientPublicKey,
            previousMessageHash
        );
        
        const signedMessage = clientKeyPair.sign(message);
        const messageBytes = signedMessage.toBytes();
        
        // Log complete message details
        const messageHashHex = signedMessage.computeHashHex();
        const messageDetails = {
            statementId: signedMessage.statementId(),
            timestamp: signedMessage.timestamp(),
            timestampISO: new Date(signedMessage.timestamp() * 1000).toISOString(),
            senderPublicKey: Buffer.from(signedMessage.senderPublicKey()).toString('hex'),
            senderPublicKeyBase64: Buffer.from(signedMessage.senderPublicKey()).toString('base64'),
            previousMessageHash: signedMessage.previousMessageHash()
                ? Buffer.from(signedMessage.previousMessageHash()).toString('hex')
                : null,
            payload: signedMessage.payloadString(),
            payloadBytes: Array.from(signedMessage.payload()).map(b => b.toString(16).padStart(2, '0')).join(''),
            payloadHash: Buffer.from(signedMessage.payloadHash()).toString('hex'),
            messageHash: messageHashHex,
            signature: 'N/A - signature is embedded in serialized message',
            signatureBase64: 'N/A - signature is embedded in serialized message',
            serializedMessage: Buffer.from(messageBytes).toString('hex'),
            serializedMessageBase64: Buffer.from(messageBytes).toString('base64')
        };
        
        log('=== SENDING IRREF MESSAGE ===');
        log('Message details:', messageDetails);
        
        // Serialize and send
        const postData = JSON.stringify({
            message: Buffer.from(messageBytes).toString('base64')
        });
        
        log('HTTP Request:', {
            method: 'POST',
            url: `${SERVER_URL}/message`,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            body: postData
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/message',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    // Save complete response to file
                    const responseFile = path.join(responsesDir, `response-${Date.now()}-${signedMessage.statementId()}.json`);
                    const fullResponse = {
                        request: {
                            message: messageDetails,
                            httpRequest: {
                                method: 'POST',
                                url: `${SERVER_URL}/message`,
                                headers: options.headers,
                                body: postData
                            }
                        },
                        response: {
                            httpStatus: res.statusCode,
                            httpHeaders: res.headers,
                            body: response,
                            rawBody: data
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    fs.writeFileSync(responseFile, JSON.stringify(fullResponse, null, 2));
                    log(`✓ Complete response saved to: ${responseFile}`);
                    
                    if (response.success) {
                        log('✓ Message sent and verified by server');
                        
                        // Verify server's response message
                        const responseMessageBytes = Buffer.from(response.message, 'base64');
                        const responseMessage = Message.fromBytes(new Uint8Array(responseMessageBytes));
                        
                        // Log server response details
                        const serverResponseDetails = {
                            statementId: responseMessage.statementId(),
                            timestamp: responseMessage.timestamp(),
                            timestampISO: new Date(responseMessage.timestamp() * 1000).toISOString(),
                            senderPublicKey: Buffer.from(responseMessage.senderPublicKey()).toString('hex'),
                            senderPublicKeyBase64: Buffer.from(responseMessage.senderPublicKey()).toString('base64'),
                            previousMessageHash: Buffer.from(responseMessage.previousMessageHash()).toString('hex'),
                            payload: responseMessage.payloadString(),
                            payloadHash: Buffer.from(responseMessage.payloadHash()).toString('hex'),
                            messageHash: responseMessage.computeHashHex(),
                            signature: 'N/A - signature is embedded in serialized message',
                            signatureBase64: 'N/A - signature is embedded in serialized message',
                            serializedMessage: Buffer.from(responseMessage.toBytes()).toString('hex'),
                            serializedMessageBase64: Buffer.from(responseMessage.toBytes()).toString('base64')
                        };
                        
                        log('=== SERVER RESPONSE MESSAGE ===');
                        log('Server response details:', serverResponseDetails);
                        
                        // Verify server's message
                        const serverPublicKey = new Uint8Array(Buffer.from(response.serverPublicKey, 'base64'));
                        const verified = responseMessage.verifyWithPublicKey(serverPublicKey);
                        
                        if (verified) {
                            log('✓ Server response verified');
                            log('=== REQUEST COMPLETE ===\n');
                            resolve({
                                message: responseMessage,
                                previousHash: new Uint8Array(Buffer.from(messageDetails.messageHash, 'hex')),
                                responseFile: responseFile
                            });
                        } else {
                            log('✗ Server response verification FAILED');
                            reject(new Error('Server response verification failed'));
                        }
                    } else {
                        log('✗ Server error:', { error: response.error });
                        reject(new Error(response.error));
                    }
                } catch (error) {
                    log('✗ Error processing response:', { error: error.message, stack: error.stack });
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            log('✗ HTTP request error:', { error: error.message });
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Main test function
async function runTest() {
    try {
        console.log('1. Getting server public key...');
        const serverPublicKey = await getServerPublicKey();
        console.log('   ✓ Server public key received\n');
        
        // Test 1: Send a simple message
        console.log('2. Test 1: Sending simple message...');
        const result1 = await sendMessage('Hello from client! This is test message #1');
        console.log(`   ✓ Response saved to: ${result1.responseFile}\n`);
        
        // Test 2: Send a chained message
        console.log('3. Test 2: Sending chained message...');
        const result2 = await sendMessage(
            'This is test message #2, chained to message #1',
            result1.previousHash
        );
        console.log(`   ✓ Response saved to: ${result2.responseFile}\n`);
        
        // Test 3: Send another chained message
        console.log('4. Test 3: Sending another chained message...');
        const result3 = await sendMessage(
            'This is test message #3, chained to message #2',
            result2.previousHash
        );
        console.log(`   ✓ Response saved to: ${result3.responseFile}\n`);
        
        console.log('=== All Tests Passed ===\n');
        console.log(`All responses saved to: ${responsesDir}`);
        console.log(`All logs saved to: ${logsDir}\n`);
        process.exit(0);
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
runTest();

/**
 * IRREF Verification Server
 * 
 * Simple HTTP server to host the verification webpage
 * Run this to access the verifier at http://localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        // Serve the verification page
        const filePath = path.join(__dirname, 'verify.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading page');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else if (req.url.startsWith('/pkg/')) {
        // Serve WASM files
        const filePath = path.join(__dirname, '..', 'irref-sdk', req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                const ext = path.extname(filePath);
                const contentType = {
                    '.wasm': 'application/wasm',
                    '.js': 'application/javascript',
                    '.ts': 'application/typescript'
                }[ext] || 'application/octet-stream';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log('=== IRREF Verification Server ===');
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open this URL in your browser to verify messages');
    console.log('');
});


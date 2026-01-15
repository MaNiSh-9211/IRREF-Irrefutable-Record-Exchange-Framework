# TLS/SSL Setup Guide for IRREF

## Your Question

> "If I use this protocol as it's built, will there be TLS/SSL encryption? Since HTTP/2 is based on TCP, does TLS/SSL need to be there? Do I need to buy something?"

## Short Answer

**Current Implementation: NO TLS/SSL (HTTP only, for testing)**
**Production: YES, you should add TLS/SSL**
**Cost: FREE (Let's Encrypt) or PAID (commercial certificates)**

---

## Current Implementation Status

### What's Currently Built

```javascript
// test/bank-server.js (Current)
const http = require('http');  // ← Plain HTTP, NO encryption
const server = http.createServer(...);
server.listen(3000);  // ← http://localhost:3000 (not https://)
```

**Status:**
- ❌ **NO TLS/SSL encryption** (plain HTTP)
- ❌ **NO HTTPS** (only HTTP)
- ✅ **IRREF signatures work** (but data is not encrypted in transit)
- ⚠️ **Suitable for testing only** (not production)

### What This Means

```
Current Setup:
  Client → HTTP (plain text) → Bank Server
  ├─ IRREF message: Signed ✓
  ├─ IRREF signature: Valid ✓
  └─ Data encryption: ❌ NO (plain text over network)

Risk:
  - Eavesdroppers can read data
  - Man-in-the-middle attacks possible
  - Data exposed during transit
```

---

## HTTP/2 and TLS Relationship

### HTTP/2 Protocol Stack

```
┌─────────────────────────────────────┐
│  Application Layer                  │
│  ┌───────────────────────────────┐  │
│  │  IRREF Protocol              │  │
│  │  (Message signing)            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Application Protocol                │
│  ┌───────────────────────────────┐  │
│  │  HTTP/2                      │  │
│  │  (Request/Response protocol)  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Security Layer (OPTIONAL but recommended)│
│  ┌───────────────────────────────┐  │
│  │  TLS/SSL                      │  │
│  │  (Encryption in transit)      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Transport Layer                    │
│  ┌───────────────────────────────┐  │
│  │  TCP                         │  │
│  │  (Reliable delivery)         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Network Layer                      │
│  ┌───────────────────────────────┐  │
│  │  IP                          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### HTTP/2 and TLS

**HTTP/2 Specification:**
- HTTP/2 **CAN** work without TLS (h2c - HTTP/2 Cleartext)
- But **most browsers and servers require TLS** for HTTP/2
- **Production HTTP/2 almost always uses TLS**

**Why TLS is Required for HTTP/2:**
- Browser support: Chrome, Firefox, Safari require TLS for HTTP/2
- Security: HTTP/2 multiplexing without encryption is risky
- Best practice: Always use TLS with HTTP/2

---

## Adding TLS/SSL to IRREF

### Option 1: HTTPS with Node.js (Recommended)

```javascript
// bank-server-https.js
const https = require('https');
const fs = require('fs');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// TLS/SSL Configuration
const tlsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),      // TLS private key
  cert: fs.readFileSync('path/to/certificate.pem'),     // TLS certificate
  // Optional: For HTTP/2
  // allowHTTP1: true,  // Allow HTTP/1.1 fallback
};

// Create HTTPS server
const server = https.createServer(tlsOptions, (req, res) => {
  // Same IRREF logic as before
  // Messages still signed with Ed25519 (IRREF keys)
  // But now also encrypted with TLS
});

server.listen(443, () => {
  console.log('HTTPS server listening on https://localhost:443');
});
```

### Option 2: Reverse Proxy (Nginx, Apache)

**Use Nginx/Apache for TLS, Node.js for IRREF:**

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name bank.example.com;

    # TLS/SSL Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;

    # Proxy to Node.js (IRREF server)
    location / {
        proxy_pass http://localhost:3000;  # Your IRREF server
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Benefits:**
- ✅ Nginx handles TLS termination
- ✅ Node.js focuses on IRREF logic
- ✅ Better performance (Nginx is fast)
- ✅ Easy to add load balancing

---

## Getting TLS/SSL Certificates

### Option 1: FREE - Let's Encrypt (Recommended)

**Cost: FREE**
**Validity: 90 days (auto-renewable)**

#### Setup with Certbot:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d bank.example.com

# Certificates saved to:
# /etc/letsencrypt/live/bank.example.com/fullchain.pem
# /etc/letsencrypt/live/bank.example.com/privkey.pem
```

#### Use in Node.js:

```javascript
const tlsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/bank.example.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/bank.example.com/fullchain.pem'),
};
```

#### Auto-Renewal:

```bash
# Add to crontab (renew every 30 days)
0 0 1 * * certbot renew --quiet
```

**Pros:**
- ✅ Free
- ✅ Trusted by all browsers
- ✅ Auto-renewal possible
- ✅ Perfect for production

**Cons:**
- ⚠️ 90-day validity (need renewal)
- ⚠️ Requires domain name (can't use IP)

### Option 2: Self-Signed Certificate (Testing Only)

**Cost: FREE**
**Validity: Custom**
**Use: Testing/Development only**

#### Generate Self-Signed Certificate:

```bash
# Generate private key
openssl genrsa -out private-key.pem 2048

# Generate certificate
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365

# Answer prompts:
# Country: US
# State: CA
# City: San Francisco
# Organization: Your Company
# Common Name: localhost (or your domain)
```

#### Use in Node.js:

```javascript
const tlsOptions = {
  key: fs.readFileSync('./private-key.pem'),
  cert: fs.readFileSync('./certificate.pem'),
};
```

**Pros:**
- ✅ Free
- ✅ No domain needed (works with localhost)
- ✅ Good for testing

**Cons:**
- ❌ Browser warning (not trusted)
- ❌ Not for production
- ❌ Clients must accept certificate

### Option 3: Commercial Certificate (Paid)

**Cost: $50 - $500+ per year**
**Validity: 1-3 years**
**Use: Enterprise/High-security**

#### Providers:
- **DigiCert**: $200-500/year
- **GlobalSign**: $150-400/year
- **Sectigo**: $50-200/year
- **GoDaddy**: $70-200/year

**Pros:**
- ✅ Longer validity
- ✅ Extended validation (EV) available
- ✅ Insurance/warranty
- ✅ Support

**Cons:**
- ❌ Costs money
- ❌ Let's Encrypt is free and works just as well

---

## Complete Production Setup

### Step 1: Get TLS Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d bank.example.com
```

### Step 2: Update Bank Server

```javascript
// bank-server-production.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const { KeyPair, Message } = require('../irref-sdk/dist/index');

// Load TLS certificates
const tlsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/bank.example.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/bank.example.com/fullchain.pem'),
  // Security options
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
};

// Load IRREF keys (separate from TLS keys!)
let bankKeyPair, bankPublicKey;
// ... (same IRREF key loading as before)

// Create HTTPS server
const server = https.createServer(tlsOptions, (req, res) => {
  // Same IRREF logic
  // Messages signed with Ed25519 (IRREF keys)
  // Data encrypted with TLS
});

server.listen(443, () => {
  console.log('Bank IRREF Server (HTTPS) listening on https://bank.example.com:443');
});
```

### Step 3: Update Client

```javascript
// bank-client-production.js
const https = require('https');

// Use HTTPS instead of HTTP
const options = {
  hostname: 'bank.example.com',
  port: 443,
  path: '/api/process',
  method: 'POST',
  // TLS verification (recommended)
  rejectUnauthorized: true,  // Verify certificate
};

const req = https.request(options, (res) => {
  // Same IRREF logic
  // TLS decrypts data
  // IRREF verifies signature
});
```

---

## Two Types of Keys

### Important: TLS Keys ≠ IRREF Keys

```
┌─────────────────────────────────────┐
│  TLS Keys (Transport Layer)         │
├─────────────────────────────────────┤
│  Purpose: Encrypt data in transit   │
│  Algorithm: RSA or ECDSA            │
│  Location: TLS certificate files    │
│  Generated: By Certbot/CA          │
│  Used for: HTTPS connection         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  IRREF Keys (Application Layer)    │
├─────────────────────────────────────┤
│  Purpose: Sign messages            │
│  Algorithm: Ed25519                │
│  Location: bank-keys/ directory   │
│  Generated: By your code           │
│  Used for: Message signatures     │
└─────────────────────────────────────┘
```

**Both are needed:**
- ✅ **TLS keys**: Encrypt connection (HTTPS)
- ✅ **IRREF keys**: Sign messages (non-repudiation)

---

## Summary

### Your Questions Answered

**Q1: Will there be TLS/SSL encryption?**
- ❌ **Current implementation: NO** (HTTP only, for testing)
- ✅ **Production: YES, you should add it**

**Q2: Since HTTP/2 is based on TCP, does TLS/SSL need to be there?**
- ✅ **YES, for production** (HTTP/2 almost always uses TLS)
- ⚠️ **Technically HTTP/2 can work without TLS**, but browsers require it

**Q3: Do I need to buy something?**
- ✅ **NO, you can use Let's Encrypt (FREE)**
- 💰 **Optional: Commercial certificates ($50-500/year)**

### What You Need to Do

1. **For Testing (Current):**
   - ✅ Already works (HTTP, no TLS)
   - ⚠️ Not secure, but fine for development

2. **For Production:**
   - ✅ Get free certificate from Let's Encrypt
   - ✅ Update server to use HTTPS
   - ✅ Update client to use HTTPS
   - ✅ Both TLS (encryption) and IRREF (signatures) will work together

### Cost Breakdown

```
TLS/SSL Certificate:
  ✅ Let's Encrypt: FREE (recommended)
  💰 Commercial: $50-500/year (optional)

IRREF:
  ✅ FREE (open source)
  ✅ No certificates needed
  ✅ Just generate Ed25519 keys

Total Cost: $0 (using Let's Encrypt)
```

---

## Quick Start: Add TLS to Current Implementation

### Step 1: Generate Self-Signed Certificate (Testing)

```bash
cd test
openssl genrsa -out tls-private-key.pem 2048
openssl req -new -x509 -key tls-private-key.pem -out tls-certificate.pem -days 365
```

### Step 2: Update bank-server.js

```javascript
// Change from:
const http = require('http');
const server = http.createServer(...);

// To:
const https = require('https');
const fs = require('fs');
const tlsOptions = {
  key: fs.readFileSync('./tls-private-key.pem'),
  cert: fs.readFileSync('./tls-certificate.pem'),
};
const server = https.createServer(tlsOptions, ...);
```

### Step 3: Update bank-client.js

```javascript
// Change from:
const http = require('http');
http.request('http://localhost:3000', ...);

// To:
const https = require('https');
https.request('https://localhost:3000', {
  rejectUnauthorized: false  // For self-signed cert (testing only)
}, ...);
```

**That's it! Now you have TLS + IRREF working together!**






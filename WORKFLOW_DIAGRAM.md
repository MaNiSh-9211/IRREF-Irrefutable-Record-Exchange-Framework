# IRREF Workflow with Fixed Keys - Visual Guide

## Complete Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETUP (One Time)                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Bank Server  │
│              │
│ 1. Generate  │───> Ed25519 Key Pair
│    Key Pair  │     ├─ Private Key (encrypted, stored)
│              │     └─ Public Key (stored, can be shared)
└──────────────┘
       │
       │
       ▼
┌──────────────┐
│ 2. Create    │───> Legal Attestation Document
│    Legal     │     "I, Bank XYZ, attest that public key
│    Attest.   │      ABC123... belongs to me"
└──────────────┘
       │
       │
       ▼
┌──────────────┐
│ 3. Publish   │───> Public Key + Attestation
│    Public    │     Available via GET /public-key
│    Key       │
└──────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    RUNTIME (Every API Call)                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐                    ┌──────────────┐
│   Client    │                    │ Bank Server │
│ (Your Svc)  │                    │             │
└──────────────┘                    └──────────────┘
       │                                    │
       │  [First Call Only]                │
       │                                    │
       ├─── GET /public-key ───────────────>│
       │                                    │
       │<─── {                              │
       │     publicKey: "ABC123...",       │
       │     attestation: {...}             │
       │    } ─────────────────────────────┤
       │                                    │
       │ Store: bankPublicKey = "ABC123..." │
       │                                    │
       │                                    │
       │  [Every API Call]                  │
       │                                    │
       │ 1. Create Request                  │
       │    - Payload: {action: "transfer"} │
       │    - Sign with YOUR private key    │
       │                                    │
       ├─── POST /api/process ─────────────>│
       │    {message: "base64_cbor"}        │
       │                                    │
       │                                    │ 2. Receive Request
       │                                    │    - Deserialize message
       │                                    │    - Verify YOUR signature
       │                                    │    - Process business logic
       │                                    │
       │                                    │ 3. Create Response
       │                                    │    - Payload: {status: "ok"}
       │                                    │    - Sign with BANK's key
       │                                    │      (FIXED KEY - same always!)
       │                                    │
       │<─── {                              │
       │     message: "base64_cbor",        │
       │     publicKey: "ABC123...",  ←─────┼── Always included!
       │     publicKeyHex: "abc123...",    │
       │     attestation: {...}             │
       │    } ─────────────────────────────┤
       │                                    │
       │ 4. Verify Response                 │
       │    - Extract publicKey from resp   │
       │    - Check: matches "ABC123..."?  │
       │      ✓ Yes → Verify signature      │
       │      ✗ No → REJECT (security!)     │
       │    - Verify signature              │
       │                                    │
       │                                    │
       └────────────────────────────────────┘
```

## Key Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    BANK SERVER                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Private Key:                                                │
│  ┌──────────────────────────────────────┐                  │
│  │ Encrypted File:                       │                  │
│  │ bank-keys/private.key.encrypted       │                  │
│  │                                       │                  │
│  │ OR                                    │                  │
│  │                                       │                  │
│  │ Environment Variable:                 │                  │
│  │ BANK_PRIVATE_KEY_ENCRYPTED            │                  │
│  │                                       │                  │
│  │ OR                                    │                  │
│  │                                       │                  │
│  │ Hardcoded Constant:                   │                  │
│  │ const PRIVATE_KEY = "encrypted..."    │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Public Key:                                                 │
│  ┌──────────────────────────────────────┐                  │
│  │ Plain Text File:                     │                  │
│  │ bank-keys/public.key                 │                  │
│  │ (It's public - can be shared)        │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Legal Attestation:                                          │
│  ┌──────────────────────────────────────┐                  │
│  │ bank-keys/legal-attestation.json      │                  │
│  │ "I attest that ABC123... is mine"    │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Usage:                                                      │
│  - Load keys ONCE at server startup                        │
│  - Use SAME keys for ALL messages                          │
│  - Include public key in EVERY response                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Your Service)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Private Key:                                           │
│  ┌──────────────────────────────────────┐                  │
│  │ client-keys/private.key.encrypted     │                  │
│  │ (Your service's key pair)             │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Bank's Public Key (Stored After First Call):               │
│  ┌──────────────────────────────────────┐                  │
│  │ In Memory/Cache:                     │                  │
│  │ bankPublicKey = "ABC123..."           │                  │
│  │                                       │                  │
│  │ Verify on every response:            │                  │
│  │ - Does response.publicKey match?      │                  │
│  │   ✓ Yes → Continue                   │                  │
│  │   ✗ No → REJECT                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Why Fixed Keys Work

### Scenario: Dispute After 1 Year

```
┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Jan 2024:                                                   │
│  ┌──────────────────────────────────────┐                  │
│  │ Bank generates key pair               │                  │
│  │ Public Key: ABC123...                 │                  │
│  │ Creates legal attestation             │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Jan 2024 - Dec 2024:                                        │
│  ┌──────────────────────────────────────┐                  │
│  │ Bank sends 10,000 messages           │                  │
│  │ ALL signed with same key: ABC123...   │                  │
│  │ ALL include public key: ABC123...    │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Dec 2024:                                                   │
│  ┌──────────────────────────────────────┐                  │
│  │ You receive message:                  │                  │
│  │ "Transfer $1M to account XYZ"         │                  │
│  │ Signed with: ABC123...                 │                  │
│  │ You process the transfer              │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Jan 2025:                                                   │
│  ┌──────────────────────────────────────┐                  │
│  │ Bank: "I never sent that message!"   │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │ YOU PROVE:                            │                  │
│  │                                       │                  │
│  │ 1. Cryptographic Proof:               │                  │
│  │    - Valid Ed25519 signature          │                  │
│  │    - Only ABC123... private key       │                  │
│  │      could create it                  │                  │
│  │                                       │                  │
│  │ 2. Consistency Proof:                 │                  │
│  │    - Same key ABC123... in msg #1     │                  │
│  │    - Same key ABC123... in msg #5000  │                  │
│  │    - Same key ABC123... in msg #10000 │                  │
│  │    - Same key ABC123... in disputed   │                  │
│  │      message                          │                  │
│  │                                       │                  │
│  │ 3. Legal Proof:                        │                  │
│  │    - Legal attestation: "Bank XYZ     │                  │
│  │      attests ABC123... is their key"  │                  │
│  │    - Signed by bank representative    │                  │
│  │    - Dated Jan 2024                   │                  │
│  │                                       │                  │
│  │ RESULT: Bank cannot deny!             │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Comparison: Fixed vs Changing Keys

```
┌─────────────────────────────────────────────────────────────┐
│              FIXED KEYS (Current Implementation)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Storage:                                                    │
│  ┌──────────────────────────────────────┐                  │
│  │ Bank: 1 private key, 1 public key    │                  │
│  │ Client: 1 private key, 1 public key  │                  │
│  │ Total: 4 keys                        │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Verification:                                               │
│  ┌──────────────────────────────────────┐                  │
│  │ "Is this the same key as before?"    │                  │
│  │ Simple comparison: ✓ or ✗            │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Non-Repudiation:                                            │
│  ┌──────────────────────────────────────┐                  │
│  │ ✓ Strong: Cannot deny with evidence  │                  │
│  │   - Cryptographic proof              │                  │
│  │   - Consistency proof                 │                  │
│  │   - Legal proof                       │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Long-Term:                                                  │
│  ┌──────────────────────────────────────┐                  │
│  │ ✓ Verifiable years later            │                  │
│  │ ✓ Clear audit trail                  │                  │
│  │ ✓ Legal admissibility                │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           CHANGING KEYS (Would Break Protocol)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Storage:                                                    │
│  ┌──────────────────────────────────────┐                  │
│  │ Bank: 365 private keys, 365 public   │                  │
│  │       (one per day for 1 year)        │                  │
│  │ Client: Must store all 365 keys      │                  │
│  │ Total: 730+ keys                     │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Verification:                                               │
│  ┌──────────────────────────────────────┐                  │
│  │ "Which key was used on Jan 15?"      │                  │
│  │ Must check key registry every time   │                  │
│  │ Complex lookup required              │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Non-Repudiation:                                            │
│  ┌──────────────────────────────────────┐                  │
│  │ ✗ Weak: Can deny with "I don't       │                  │
│  │   recognize that key"                 │                  │
│  │   - No consistency                   │                  │
│  │   - Ambiguous ownership               │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Long-Term:                                                  │
│  ┌──────────────────────────────────────┐                  │
│  │ ✗ Hard to verify years later         │                  │
│  │ ✗ Fragmented audit trail             │                  │
│  │ ✗ Weak legal evidence                 │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Answer to Your Question

> "Is the protocol still relevant with fixed keys?"

**YES! Fixed keys make it MORE relevant:**

1. ✅ **Stronger non-repudiation** - Cannot deny with overwhelming evidence
2. ✅ **Practical** - One key per entity, easy to manage
3. ✅ **Legal proof** - Attestation + consistency = strong evidence
4. ✅ **Long-term verifiable** - Can verify messages years later
5. ✅ **Storage efficient** - Only store one key per entity

**Fixed keys are not a limitation—they're the CORRECT design!**






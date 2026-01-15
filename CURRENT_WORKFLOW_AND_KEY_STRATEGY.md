# Current Workflow & Why Fixed Keys Are Essential

## Your Question

> "Is the protocol still relevant if the bank uses fixed keys? If keys change every day or every API call, we can't store thousands of keys, and clients could deny having a particular public key."

**Short Answer: YES, the protocol is MORE relevant with fixed keys. Fixed keys are the CORRECT approach, not a limitation.**

---

## Current Workflow (Fixed Keys)

### Setup Phase (One Time)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Bank Generates Key Pair (ONCE)                       │
│    - Private Key: Stored encrypted in bank-server      │
│    - Public Key: Stored in plain text (it's public)     │
│    - Legal Attestation: Created and stored              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Bank Creates Legal Attestation                       │
│    - Document: "I, Bank XYZ, attest that public key    │
│      ABC123... belongs to me"                          │
│    - Signed by authorized bank representative           │
│    - Timestamped (optional: by trusted authority)      │
│    - Stored: bank-keys/legal-attestation.json          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Bank Publishes Public Key                            │
│    - Public key: Can be shared publicly                │
│    - Attestation: Can be published on website/registry │
│    - Endpoint: GET /public-key (returns key + attest)  │
└─────────────────────────────────────────────────────────┘
```

### Runtime Phase (Every API Call)

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT (Your Service)                                   │
│                                                          │
│ 1. First Call: Get Bank's Public Key                    │
│    GET /public-key                                       │
│    Response: {                                          │
│      publicKey: "ABC123...",                            │
│      attestation: { ... }                               │
│    }                                                     │
│                                                          │
│ 2. Store Bank's Public Key (in memory/cache)           │
│    - Verify attestation                                 │
│    - Remember: "Bank XYZ's public key is ABC123..."    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Create Request Message                               │
│    - Payload: Your API request data                     │
│    - Sign with YOUR private key                         │
│    - Send to bank                                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ BANK SERVER                                              │
│                                                          │
│ 4. Receive Request                                      │
│    - Deserialize IRREF message                          │
│    - Verify signature using YOUR public key (from msg)  │
│    - Process business logic                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Create Response Message                              │
│    - Payload: Response data                             │
│    - Sign with BANK's private key (FIXED KEY)           │
│    - Include BANK's public key in response              │
│    - Include attestation (optional)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ CLIENT                                                   │
│                                                          │
│ 6. Receive Response                                     │
│    - Extract bank's public key from response            │
│    - Verify: Does it match stored key? (ABC123...)      │
│    - If match: Verify signature                         │
│    - If mismatch: REJECT (security issue!)              │
└─────────────────────────────────────────────────────────┘
```

### Key Points in Workflow

1. **Bank's keys are FIXED** - Same private/public key pair for ALL messages
2. **Public key in every response** - Client can verify it's the same bank
3. **Client stores bank's public key** - After first call, remembers it
4. **Consistency check** - Client verifies public key matches in every response
5. **Legal attestation** - Proves bank owns the key

---

## Why Fixed Keys Are CORRECT (Not a Problem)

### ✅ Fixed Keys = Strong Non-Repudiation

**Scenario: Bank denies sending message in 2026**

**With Fixed Keys:**
```
You: "Bank sent this message in 2024"
Bank: "I never sent that!"

You: "Here's the proof:"
  1. Message signature: Valid Ed25519 signature
  2. Public key in message: ABC123... (matches all responses)
  3. Legal attestation: Bank attested in 2024 that ABC123... is their key
  4. Consistency: Same key ABC123... used in 10,000 messages over 2 years
  5. Only bank has private key: Signature proves bank sent it

Bank: "But I don't recognize that key!"
You: "You attested to it in 2024. Here's the legal document."
Bank: "That's not my key!"
You: "Then why did you use it in 10,000 messages? Why is it in your attestation?"
```

**Result: Bank cannot deny. The evidence is overwhelming.**

### ❌ Changing Keys = Weak Non-Repudiation

**If keys changed every day:**

```
You: "Bank sent this message on Jan 15, 2024"
Bank: "I never sent that!"

You: "Here's the signature with public key XYZ789..."
Bank: "I don't recognize that key. I use different keys every day."
You: "But you used XYZ789... on Jan 15..."
Bank: "I have no record of that key. It might be fake."
You: "But the signature is valid..."
Bank: "Maybe someone else had that key. I can't verify."

Result: Ambiguity. Hard to prove.
```

**Problems with changing keys:**
1. **Key explosion**: Thousands of keys to track
2. **No consistency**: Can't verify it's the same entity
3. **Deniability**: "I don't recognize that key" becomes plausible
4. **Storage burden**: Must store all historical keys
5. **Verification complexity**: Must check key registry for every message

---

## Why Your Concern Is Actually Solved by Fixed Keys

### Your Concern:
> "If keys change every day, we can't store thousands of keys, and clients could deny having a particular public key."

### The Solution: Fixed Keys

**With Fixed Keys:**
- ✅ **One key per entity** - Bank has ONE key, you have ONE key
- ✅ **Easy to store** - Just store one public key per entity
- ✅ **No denial possible** - Bank attested to the key, used it consistently
- ✅ **Simple verification** - Check: "Is this the same key as before?"

**With Changing Keys:**
- ❌ **Many keys per entity** - Bank has thousands of keys
- ❌ **Storage nightmare** - Must store all historical keys
- ❌ **Denial possible** - "I don't recognize that key"
- ❌ **Complex verification** - Must check registry for every message

---

## How Non-Repudiation Works with Fixed Keys

### The Three-Layer Proof

**Layer 1: Cryptographic Proof**
```
Message signature is valid
  ↓
Only bank's private key could create this signature
  ↓
Bank has the private key
```

**Layer 2: Consistency Proof**
```
Same public key ABC123... in message #1
Same public key ABC123... in message #2
Same public key ABC123... in message #10,000
  ↓
Bank consistently uses this key
  ↓
This is bank's operational key
```

**Layer 3: Legal Proof**
```
Legal attestation: "Bank XYZ attests that ABC123... is their key"
Signed by authorized bank representative
Timestamped in 2024
  ↓
Bank legally bound to this key
  ↓
Bank cannot deny ownership
```

### Combined Proof = Irrefutable

```
Cryptographic Proof + Consistency Proof + Legal Proof
  ↓
Bank cannot deny:
  - They have the private key (cryptographic)
  - They use it consistently (operational)
  - They legally attested to it (legal)
```

---

## Real-World Analogy

### Fixed Keys = Driver's License

**Your driver's license:**
- ✅ **Fixed ID number** - Same number for years
- ✅ **Issued by authority** - DMV attests to your identity
- ✅ **Consistent use** - You use it everywhere
- ✅ **Cannot deny** - "That's not my license number" doesn't work if you've used it everywhere

**If you changed ID every day:**
- ❌ **No consistency** - Different number every day
- ❌ **Hard to verify** - Must check registry every time
- ❌ **Deniable** - "I don't recognize that number" becomes plausible

**Same with IRREF:**
- ✅ **Fixed public key** = Your "identity" in the system
- ✅ **Legal attestation** = DMV issuing your license
- ✅ **Consistent use** = Using same key everywhere
- ✅ **Cannot deny** = Evidence is overwhelming

---

## Protocol Relevance: MORE Relevant with Fixed Keys

### Why Fixed Keys Make IRREF MORE Relevant

1. **Stronger Non-Repudiation**
   - Fixed keys + legal attestation = Irrefutable proof
   - Changing keys = Ambiguity and deniability

2. **Practical Implementation**
   - One key per entity = Simple to manage
   - Many keys = Complex and error-prone

3. **Long-Term Verifiability**
   - Fixed keys = Can verify messages years later
   - Changing keys = Must maintain key registry forever

4. **Legal Admissibility**
   - Fixed keys + attestation = Strong legal evidence
   - Changing keys = Weak legal evidence

5. **Audit Trail**
   - Fixed keys = Clear audit trail
   - Changing keys = Fragmented audit trail

---

## What If Keys Need to Rotate?

### Key Rotation Strategy (If Needed)

**Scenario: Bank wants to rotate keys (e.g., every 5 years)**

```
Year 1-5: Use Key Pair A
  - Public Key A in all messages
  - Legal attestation for Key A

Year 5: Rotate to Key Pair B
  - Announce rotation: "We're switching to Key B"
  - Create new attestation for Key B
  - Send transition message signed with BOTH keys:
    - Signed with Key A: "I'm transitioning to Key B"
    - Signed with Key B: "I'm transitioning from Key A"
  - Use Key B for all new messages

Year 5-10: Use Key Pair B
  - Public Key B in all messages
  - Legal attestation for Key B
```

**Key Points:**
- ✅ Rotation is **rare** (years, not days)
- ✅ **Transition message** links old key to new key
- ✅ **Both keys attested** during transition
- ✅ **Historical messages** still verifiable with old key

**This is NOT the same as changing keys every day!**

---

## Summary

### Your Question: "Is protocol relevant with fixed keys?"

**Answer: YES, MORE relevant!**

### Why Fixed Keys Are Essential:

1. ✅ **Stronger non-repudiation** - Cannot deny with fixed keys
2. ✅ **Practical** - One key per entity, easy to manage
3. ✅ **Legal proof** - Attestation + consistency = strong evidence
4. ✅ **Long-term verifiable** - Can verify messages years later
5. ✅ **Audit-friendly** - Clear, consistent audit trail

### Why Changing Keys Would Break It:

1. ❌ **Weak non-repudiation** - "I don't recognize that key"
2. ❌ **Impractical** - Thousands of keys to track
3. ❌ **Weak legal proof** - No consistency, hard to prove
4. ❌ **Complex verification** - Must check registry every time
5. ❌ **Storage burden** - Must store all historical keys

### The Protocol Is Designed for Fixed Keys:

- **Legal attestation** assumes fixed keys
- **Consistency verification** assumes fixed keys
- **Long-term verifiability** assumes fixed keys
- **Non-repudiation** relies on fixed keys

**Fixed keys are not a limitation—they're a feature!**

---

## Current Implementation

The `bank-server.js` and `bank-client.js` implement fixed keys correctly:

- ✅ Keys generated once
- ✅ Stored persistently
- ✅ Legal attestation created
- ✅ Public key in every response
- ✅ Consistency verification
- ✅ Long-term non-repudiation

**This is the CORRECT approach for production!**






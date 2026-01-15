# IRREF SDK - Node.js

Node.js SDK for the **IRREF (Irrefutable Record Exchange Framework)** protocol.

## Installation

```bash
npm install irref-sdk
```

## Quick Start

```typescript
import { KeyPair, Message } from 'irref-sdk';

// Generate a key pair
const alice = KeyPair.generate();

// Create and sign a message
const message = Message.create('Hello, IRREF!', alice.publicKey());
const signed = alice.sign(message);

// Verify the message
console.log('Verified:', signed.verify());

// Serialize for transmission
const bytes = signed.toBytes();

// Deserialize and verify
const received = Message.fromBytes(bytes);
console.log('Still verified:', received.verify());
```

## API Reference

### KeyPair

#### `KeyPair.generate()`
Generate a new Ed25519 key pair.

#### `KeyPair.fromPrivateKey(privateKey: Uint8Array)`
Create a key pair from existing private key bytes.

#### `keyPair.publicKey(): Uint8Array`
Get the public key.

#### `keyPair.privateKey(): Uint8Array`
Get the private key (keep secure!).

#### `keyPair.sign(message: Message): Message`
Sign a message.

### Message

#### `Message.create(payload, senderPublicKey, previousMessageHash?)`
Create a new unsigned message.

#### `Message.fromBytes(data: Uint8Array): Message`
Deserialize a message from CBOR bytes.

#### `message.toBytes(): Uint8Array`
Serialize the message to CBOR bytes.

#### `message.verify(): boolean`
Verify the message signature.

#### `message.verifyWithPublicKey(publicKey: Uint8Array): boolean`
Verify with a specific public key.

#### `message.computeHashHex(): string`
Get the message hash as a hex string.

### Receipt

#### `Receipt.create(message: Message): Receipt`
Create a receipt for a verified message.

#### `receipt.verified(): boolean`
Whether the message was verified.

### Chain Verification

#### `verifyChain(messages: Message[]): boolean`
Verify a chain of messages.

## Examples

See `src/example.ts` for a complete example.

## License

MIT OR Apache-2.0


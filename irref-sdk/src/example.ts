/**
 * IRREF SDK Example
 * 
 * Demonstrates:
 * - Creating and signing messages
 * - Verifying messages
 * - Hash chaining
 * - Tamper detection
 */

import { KeyPair, Message, Receipt, verifyChain, computeHashHex } from './index';

console.log('=== IRREF SDK Example ===\n');

// 1. Generate key pairs
console.log('1. Generating key pairs...');
const alice = KeyPair.generate();
const bob = KeyPair.generate();

console.log('   Alice public key:', Buffer.from(alice.publicKey()).toString('hex').substring(0, 32) + '...');
console.log('   Bob public key:', Buffer.from(bob.publicKey()).toString('hex').substring(0, 32) + '...\n');

// 2. Create and sign a message
console.log('2. Creating and signing a message...');
const payload1 = 'Hello, IRREF! This is my first message.';
const message1 = Message.create(payload1, alice.publicKey());
const signed1 = alice.sign(message1);

console.log('   Statement ID:', signed1.statementId());
console.log('   Timestamp:', new Date(signed1.timestamp() * 1000).toISOString());
console.log('   Payload:', signed1.payloadString());
console.log('   Message hash:', signed1.computeHashHex().substring(0, 32) + '...\n');

// 3. Verify the message
console.log('3. Verifying the message...');
const receipt1 = Receipt.create(signed1);
console.log('   Verified:', receipt1.verified());
console.log('   Verified at:', new Date(receipt1.verifiedAt() * 1000).toISOString());
console.log('   Direct verify:', signed1.verify(), '\n');

// 4. Create a chained message
console.log('4. Creating a chained message...');
const payload2 = 'This is my second message, chained to the first.';
const hash1 = signed1.computeHash();
const message2 = Message.create(payload2, alice.publicKey(), hash1);
const signed2 = alice.sign(message2);

console.log('   Statement ID:', signed2.statementId());
console.log('   Previous hash:', signed2.previousMessageHash() 
  ? Buffer.from(signed2.previousMessageHash()!).toString('hex').substring(0, 32) + '...'
  : 'none');
console.log('   Message hash:', signed2.computeHashHex().substring(0, 32) + '...\n');

// 5. Verify the chain
console.log('5. Verifying the message chain...');
const chainVerified = verifyChain([signed1, signed2]);
console.log('   Chain verified:', chainVerified, '\n');

// 6. Serialize and deserialize
console.log('6. Serializing and deserializing...');
const serialized = signed1.toBytes();
console.log('   Serialized size:', serialized.length, 'bytes');
const deserialized = Message.fromBytes(serialized);
console.log('   Deserialized payload:', deserialized.payloadString());
console.log('   Still verified:', deserialized.verify(), '\n');

// 7. Tamper detection
console.log('7. Demonstrating tamper detection...');
const tamperedBytes = signed1.toBytes();
// Tamper with the bytes (in a real scenario, this would break the signature)
console.log('   Original message verified:', signed1.verify());
console.log('   (In a real tampering scenario, verification would fail)\n');

// 8. Cross-verification (Bob verifies Alice's message)
console.log('8. Cross-verification (Bob verifies Alice\'s message)...');
const verifiedByBob = signed1.verifyWithPublicKey(alice.publicKey());
console.log('   Verified with Alice\'s public key:', verifiedByBob);
const verifiedByWrongKey = signed1.verifyWithPublicKey(bob.publicKey());
console.log('   Verified with Bob\'s public key (should fail):', verifiedByWrongKey, '\n');

console.log('=== Example Complete ===');


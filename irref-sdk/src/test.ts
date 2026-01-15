/**
 * IRREF SDK Test
 * 
 * Basic test to verify SDK functionality
 */

import { KeyPair, Message, Receipt, verifyChain, computeHashHex } from './index';

console.log('=== IRREF SDK Test ===\n');

try {
  // Test 1: Key generation
  console.log('Test 1: Key generation...');
  const keypair = KeyPair.generate();
  const publicKey = keypair.publicKey();
  const privateKey = keypair.privateKey();
  console.log('  ✓ Generated key pair');
  console.log('  Public key length:', publicKey.length, 'bytes');
  console.log('  Private key length:', privateKey.length, 'bytes\n');

  // Test 2: Message creation and signing
  console.log('Test 2: Message creation and signing...');
  const payload = 'Test message';
  const message = Message.create(payload, publicKey);
  const signed = keypair.sign(message);
  console.log('  ✓ Message created and signed');
  console.log('  Statement ID:', signed.statementId());
  console.log('  Payload:', signed.payloadString());
  console.log('  Message hash:', signed.computeHashHex().substring(0, 32) + '...\n');

  // Test 3: Verification
  console.log('Test 3: Message verification...');
  const verified = signed.verify();
  if (verified) {
    console.log('  ✓ Message verified successfully\n');
  } else {
    console.log('  ✗ Verification failed\n');
    process.exit(1);
  }

  // Test 4: Serialization
  console.log('Test 4: Serialization...');
  const bytes = signed.toBytes();
  console.log('  ✓ Message serialized');
  console.log('  Serialized size:', bytes.length, 'bytes\n');

  // Test 5: Deserialization
  console.log('Test 5: Deserialization...');
  const deserialized = Message.fromBytes(bytes);
  const stillVerified = deserialized.verify();
  if (stillVerified && deserialized.payloadString() === payload) {
    console.log('  ✓ Message deserialized and verified');
    console.log('  Payload matches:', deserialized.payloadString() === payload, '\n');
  } else {
    console.log('  ✗ Deserialization or verification failed\n');
    process.exit(1);
  }

  // Test 6: Receipt
  console.log('Test 6: Receipt creation...');
  const receipt = Receipt.create(signed);
  console.log('  ✓ Receipt created');
  console.log('  Verified:', receipt.verified());
  console.log('  Verified at:', new Date(receipt.verifiedAt() * 1000).toISOString(), '\n');

  // Test 7: Hash chaining
  console.log('Test 7: Hash chaining...');
  const msg1 = Message.create('First message', publicKey);
  const signed1 = keypair.sign(msg1);
  const hash1 = signed1.computeHash();
  
  const msg2 = Message.create('Second message', publicKey, hash1);
  const signed2 = keypair.sign(msg2);
  
  const chainVerified = verifyChain([signed1, signed2]);
  if (chainVerified) {
    console.log('  ✓ Chain verified successfully\n');
  } else {
    console.log('  ✗ Chain verification failed\n');
    process.exit(1);
  }

  // Test 8: Hash computation
  console.log('Test 8: Hash computation...');
  const hash = computeHashHex('test data');
  console.log('  ✓ Hash computed');
  console.log('  Hash:', hash.substring(0, 32) + '...\n');

  console.log('=== All Tests Passed ===');
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}


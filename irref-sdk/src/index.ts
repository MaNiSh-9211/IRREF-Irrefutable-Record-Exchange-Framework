/**
 * IRREF - Irrefutable Record Exchange Framework
 * Node.js SDK
 * 
 * This SDK provides a clean JavaScript/TypeScript API for creating,
 * signing, and verifying IRREF messages with cryptographic guarantees.
 */

import * as wasm from '../pkg/irref_core';

/**
 * Key pair for signing messages
 */
export class KeyPair {
  private wasmKeyPair: wasm.WasmKeyPair;

  /**
   * Generate a new Ed25519 key pair
   */
  static generate(): KeyPair {
    return new KeyPair(new wasm.WasmKeyPair());
  }

  /**
   * Create from existing private key bytes
   */
  static fromPrivateKey(privateKey: Uint8Array): KeyPair {
    return new KeyPair(wasm.WasmKeyPair.from_private_key(privateKey));
  }

  constructor(wasmKeyPair: wasm.WasmKeyPair) {
    this.wasmKeyPair = wasmKeyPair;
  }

  /**
   * Get the public key as bytes
   */
  publicKey(): Uint8Array {
    return this.wasmKeyPair.public_key();
  }

  /**
   * Get the private key as bytes (keep secure!)
   */
  privateKey(): Uint8Array {
    return this.wasmKeyPair.private_key();
  }

  /**
   * Sign a message
   */
  sign(message: Message): Message {
    const signed = this.wasmKeyPair.sign_message(message.wasmMessage);
    return new Message(signed);
  }
}

/**
 * IRREF Message
 */
export class Message {
  wasmMessage: wasm.WasmMessage;

  /**
   * Create a new unsigned message
   */
  static create(
    payload: Uint8Array | string,
    senderPublicKey: Uint8Array,
    previousMessageHash?: Uint8Array
  ): Message {
    const payloadBytes = typeof payload === 'string' 
      ? new TextEncoder().encode(payload)
      : payload;
    
    const wasmMsg = wasm.WasmMessage.new(
      payloadBytes,
      senderPublicKey,
      previousMessageHash || undefined
    );
    
    return new Message(wasmMsg);
  }

  /**
   * Deserialize message from CBOR bytes
   */
  static fromBytes(data: Uint8Array): Message {
    const wasmMsg = wasm.WasmMessage.from_bytes(data);
    return new Message(wasmMsg);
  }

  constructor(wasmMessage: wasm.WasmMessage) {
    this.wasmMessage = wasmMessage;
  }

  /**
   * Serialize message to CBOR bytes
   */
  toBytes(): Uint8Array {
    return this.wasmMessage.to_bytes();
  }

  /**
   * Verify the message signature
   */
  verify(): boolean {
    try {
      return this.wasmMessage.verify();
    } catch {
      return false;
    }
  }

  /**
   * Verify with a specific public key
   */
  verifyWithPublicKey(publicKey: Uint8Array): boolean {
    try {
      return this.wasmMessage.verify_with_public_key(publicKey);
    } catch {
      return false;
    }
  }

  /**
   * Get the statement ID
   */
  statementId(): string {
    return this.wasmMessage.statement_id();
  }

  /**
   * Get the timestamp
   */
  timestamp(): number {
    return Number(this.wasmMessage.timestamp());
  }

  /**
   * Get the payload
   */
  payload(): Uint8Array {
    return this.wasmMessage.payload();
  }

  /**
   * Get the payload as UTF-8 string
   */
  payloadString(): string {
    return new TextDecoder().decode(this.payload());
  }

  /**
   * Get the payload hash
   */
  payloadHash(): Uint8Array {
    return this.wasmMessage.payload_hash();
  }

  /**
   * Get the payload hash as hex string
   */
  payloadHashHex(): string {
    return Array.from(this.payloadHash())
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get the previous message hash (if chained)
   */
  previousMessageHash(): Uint8Array | null {
    const hash = this.wasmMessage.previous_message_hash();
    return hash || null;
  }

  /**
   * Get the sender's public key
   */
  senderPublicKey(): Uint8Array {
    return this.wasmMessage.sender_public_key();
  }

  /**
   * Compute the message hash
   */
  computeHash(): Uint8Array {
    return this.wasmMessage.compute_hash();
  }

  /**
   * Compute the message hash as hex string
   */
  computeHashHex(): string {
    return this.wasmMessage.compute_hash_hex();
  }
}

/**
 * Receipt for message verification
 */
export class Receipt {
  private wasmReceipt: wasm.WasmReceipt;

  /**
   * Create a receipt for a message
   */
  static create(message: Message): Receipt {
    return new Receipt(wasm.WasmReceipt.create(message.wasmMessage));
  }

  constructor(wasmReceipt: wasm.WasmReceipt) {
    this.wasmReceipt = wasmReceipt;
  }

  /**
   * Whether the message was verified
   */
  verified(): boolean {
    return this.wasmReceipt.verified();
  }

  /**
   * Timestamp when verification occurred
   */
  verifiedAt(): number {
    return Number(this.wasmReceipt.verified_at());
  }
}

/**
 * Verify a chain of messages
 */
export function verifyChain(messages: Message[]): boolean {
  try {
    const wasmMessages = messages.map(m => m.wasmMessage);
    return wasm.verify_chain(wasmMessages);
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hash
 */
export function computeHash(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  return wasm.compute_hash_wasm(bytes);
}

/**
 * Compute SHA-256 hash as hex string
 */
export function computeHashHex(data: Uint8Array | string): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  return wasm.compute_hash_hex(bytes);
}

// Export WASM module for advanced usage
export { wasm };


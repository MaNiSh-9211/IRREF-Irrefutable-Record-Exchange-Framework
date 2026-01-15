//! IRREF - Irrefutable Record Exchange Framework
//! 
//! Core library providing message-level non-repudiation, tamper-evident integrity,
//! and long-term verifiability through cryptographic signatures and hash chaining.

mod message;
mod crypto;
mod error;

#[cfg(target_arch = "wasm32")]
mod wasm;

pub use message::{Message, MessageBuilder, Receipt};
pub use crypto::{KeyPair, PublicKey, PrivateKey};
pub use error::{IrrefError, IrrefResult};

use sha2::{Sha256, Digest};

/// Protocol version constant
pub const PROTOCOL_VERSION: u8 = 1;

/// Compute SHA-256 hash of data
pub fn compute_hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

/// Format hash as hex string
pub fn hash_to_hex(hash: &[u8]) -> String {
    hex::encode(hash)
}

/// Parse hex string to hash bytes
pub fn hex_to_hash(hex_str: &str) -> IrrefResult<Vec<u8>> {
    hex::decode(hex_str)
        .map_err(|_| IrrefError::InvalidFormat("Invalid hex string".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::MessageBuilder;

    #[test]
    fn test_basic_message_creation() {
        let keypair = KeyPair::generate();
        let payload = b"Hello, IRREF!";
        
        let message = MessageBuilder::new()
            .payload(payload.to_vec())
            .sender_public_key(keypair.public_key().clone())
            .build()
            .unwrap();
        
        let signed = keypair.sign_message(&message).unwrap();
        assert!(signed.verify().is_ok());
    }

    #[test]
    fn test_hash_chaining() {
        let keypair = KeyPair::generate();
        let payload1 = b"First message";
        let payload2 = b"Second message";
        
        let msg1 = MessageBuilder::new()
            .payload(payload1.to_vec())
            .sender_public_key(keypair.public_key().clone())
            .build()
            .unwrap();
        
        let signed1 = keypair.sign_message(&msg1).unwrap();
        let hash1 = signed1.compute_hash();
        
        let hash1_clone = hash1.clone();
        let msg2 = MessageBuilder::new()
            .payload(payload2.to_vec())
            .sender_public_key(keypair.public_key().clone())
            .previous_message_hash(hash1)
            .build()
            .unwrap();
        
        let signed2 = keypair.sign_message(&msg2).unwrap();
        assert!(signed2.verify().is_ok());
        assert_eq!(signed2.previous_message_hash(), Some(&hash1_clone));
    }

    #[test]
    fn test_tamper_detection() {
        let keypair = KeyPair::generate();
        let payload = b"Original message";
        
        let message = MessageBuilder::new()
            .payload(payload.to_vec())
            .sender_public_key(keypair.public_key().clone())
            .build()
            .unwrap();
        
        let signed = keypair.sign_message(&message).unwrap();
        assert!(signed.verify().is_ok());
        
        // Tamper with payload
        let mut tampered = signed.clone();
        tampered.set_payload(b"Tampered message".to_vec());
        
        // Verification should fail
        assert!(tampered.verify().is_err());
    }
}


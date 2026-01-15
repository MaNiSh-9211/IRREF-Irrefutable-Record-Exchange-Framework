//! Cryptographic primitives for IRREF

use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use rand::rngs::OsRng;
use crate::error::{IrrefError, IrrefResult};
use crate::message::Message;

/// Ed25519 key pair for signing messages
#[derive(Clone)]
pub struct KeyPair {
    signing_key: SigningKey,
}

/// Public key for verification
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PublicKey {
    verifying_key: VerifyingKey,
}

/// Private key wrapper (for internal use)
#[derive(Clone)]
pub struct PrivateKey {
    signing_key: SigningKey,
}

impl KeyPair {
    /// Generate a new Ed25519 key pair
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        Self { signing_key }
    }

    /// Create from existing key material
    pub fn from_bytes(private_key_bytes: &[u8]) -> IrrefResult<Self> {
        let signing_key = SigningKey::from_bytes(
            private_key_bytes
                .try_into()
                .map_err(|_| IrrefError::CryptoError("Invalid private key length".to_string()))?
        );
        Ok(Self { signing_key })
    }

    /// Get the public key
    pub fn public_key(&self) -> PublicKey {
        PublicKey {
            verifying_key: self.signing_key.verifying_key(),
        }
    }

    /// Get the private key bytes
    pub fn private_key_bytes(&self) -> Vec<u8> {
        self.signing_key.to_bytes().to_vec()
    }

    /// Sign a message
    pub fn sign_message(&self, message: &Message) -> IrrefResult<Message> {
        // Create a copy of the message to sign
        let mut signed_message = message.clone();
        
        // Compute the hash of the message (without signature)
        let message_hash = signed_message.compute_hash();
        
        // Sign the hash
        let signature_bytes = self.signing_key.sign(&message_hash);
        
        // Set the signature on the message
        signed_message.set_signature(signature_bytes.to_bytes().to_vec());
        
        Ok(signed_message)
    }
}

impl PublicKey {
    /// Create from bytes
    pub fn from_bytes(bytes: &[u8]) -> IrrefResult<Self> {
        let verifying_key = VerifyingKey::from_bytes(
            bytes
                .try_into()
                .map_err(|_| IrrefError::CryptoError("Invalid public key length".to_string()))?
        )
        .map_err(|e| IrrefError::CryptoError(format!("Invalid public key: {}", e)))?;
        Ok(Self { verifying_key })
    }

    /// Get the public key bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        self.verifying_key.to_bytes().to_vec()
    }

    /// Verify a message signature
    pub fn verify_message(&self, message: &Message) -> IrrefResult<()> {
        let signature_bytes = message.signature()
            .ok_or_else(|| IrrefError::MissingField("signature".to_string()))?;
        
        let signature_array: [u8; 64] = signature_bytes
            .as_slice()
            .try_into()
            .map_err(|_| IrrefError::CryptoError("Invalid signature length".to_string()))?;
        let signature = Signature::from_bytes(&signature_array);
        
        // Compute the hash of the message (without signature)
        let message_hash = message.compute_hash();
        
        // Verify the signature
        self.verifying_key
            .verify(&message_hash, &signature)
            .map_err(|e| IrrefError::VerificationFailed(format!("Signature verification failed: {}", e)))?;
        
        Ok(())
    }
}

impl PrivateKey {
    /// Create from bytes
    pub fn from_bytes(bytes: &[u8]) -> IrrefResult<Self> {
        let signing_key = SigningKey::from_bytes(
            bytes
                .try_into()
                .map_err(|_| IrrefError::CryptoError("Invalid private key length".to_string()))?
        );
        Ok(Self { signing_key })
    }

    /// Get the key pair
    pub fn to_keypair(&self) -> KeyPair {
        KeyPair {
            signing_key: self.signing_key.clone(),
        }
    }
}


//! IRREF message structure and serialization

use serde::{Deserialize, Serialize, Deserializer};
use ciborium::{ser::into_writer, de::from_reader};
use std::io::Cursor;
use crate::error::{IrrefError, IrrefResult};
use crate::{compute_hash, PROTOCOL_VERSION};
use crate::crypto::PublicKey;

/// IRREF message structure
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Message {
    /// Protocol version
    #[serde(rename = "v")]
    protocol_version: u8,
    
    /// Unique statement ID (UUID or similar)
    #[serde(rename = "id")]
    statement_id: String,
    
    /// UTC timestamp (ISO 8601 or epoch seconds)
    #[serde(rename = "ts")]
    timestamp: i64,
    
    /// Sender's public key (Ed25519, 32 bytes)
    #[serde(rename = "pk", with = "serde_bytes")]
    sender_public_key: Vec<u8>,
    
    /// Hash of previous message in chain (optional for first message)
    #[serde(rename = "prev", skip_serializing_if = "Option::is_none", with = "serde_bytes")]
    previous_message_hash: Option<Vec<u8>>,
    
    /// Message payload (opaque binary or structured CBOR)
    #[serde(rename = "pl", with = "serde_bytes")]
    payload: Vec<u8>,
    
    /// Hash of the payload
    #[serde(rename = "plh", with = "serde_bytes")]
    payload_hash: Vec<u8>,
    
    /// Digital signature (Ed25519, 64 bytes)
    /// This field is excluded from the signed data
    #[serde(rename = "sig", skip_serializing_if = "Option::is_none", with = "serde_bytes")]
    signature: Option<Vec<u8>>,
}

impl<'de> Deserialize<'de> for Message {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        use serde::de::{self, MapAccess, Visitor};
        use std::fmt;
        
        struct MessageVisitor;
        
        impl<'de> Visitor<'de> for MessageVisitor {
            type Value = Message;
            
            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("an IRREF message")
            }
            
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut protocol_version = None;
                let mut statement_id = None;
                let mut timestamp = None;
                let mut sender_public_key = None;
                let mut previous_message_hash = None;
                let mut payload = None;
                let mut payload_hash = None;
                let mut signature = None;
                
                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "v" => protocol_version = Some(map.next_value()?),
                        "id" => statement_id = Some(map.next_value()?),
                        "ts" => timestamp = Some(map.next_value()?),
                        "pk" => {
                            let bytes: serde_bytes::ByteBuf = map.next_value()?;
                            sender_public_key = Some(bytes.into_vec());
                        },
                        "prev" => {
                            let bytes: serde_bytes::ByteBuf = map.next_value()?;
                            previous_message_hash = Some(Some(bytes.into_vec()));
                        },
                        "pl" => {
                            let bytes: serde_bytes::ByteBuf = map.next_value()?;
                            payload = Some(bytes.into_vec());
                        },
                        "plh" => {
                            let bytes: serde_bytes::ByteBuf = map.next_value()?;
                            payload_hash = Some(bytes.into_vec());
                        },
                        "sig" => {
                            let bytes: serde_bytes::ByteBuf = map.next_value()?;
                            signature = Some(Some(bytes.into_vec()));
                        },
                        _ => { let _: de::IgnoredAny = map.next_value()?; }
                    }
                }
                
                Ok(Message {
                    protocol_version: protocol_version.ok_or_else(|| de::Error::missing_field("v"))?,
                    statement_id: statement_id.ok_or_else(|| de::Error::missing_field("id"))?,
                    timestamp: timestamp.ok_or_else(|| de::Error::missing_field("ts"))?,
                    sender_public_key: sender_public_key.ok_or_else(|| de::Error::missing_field("pk"))?,
                    previous_message_hash: previous_message_hash.flatten(),
                    payload: payload.ok_or_else(|| de::Error::missing_field("pl"))?,
                    payload_hash: payload_hash.ok_or_else(|| de::Error::missing_field("plh"))?,
                    signature: signature.flatten(),
                })
            }
        }
        
        deserializer.deserialize_map(MessageVisitor)
    }
}

/// Builder for creating IRREF messages
pub struct MessageBuilder {
    statement_id: Option<String>,
    timestamp: Option<i64>,
    sender_public_key: Option<Vec<u8>>,
    previous_message_hash: Option<Vec<u8>>,
    payload: Option<Vec<u8>>,
}

/// Receipt for message verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receipt {
    /// The verified message
    pub message: Message,
    /// Verification timestamp
    pub verified_at: i64,
    /// Verification result
    pub verified: bool,
}

impl Message {
    /// Create a new message builder
    pub fn builder() -> MessageBuilder {
        MessageBuilder::new()
    }

    /// Serialize message to canonical CBOR (without signature for signing)
    pub fn serialize_for_signing(&self) -> IrrefResult<Vec<u8>> {
        // Create a copy without signature
        let mut msg_for_signing = self.clone();
        msg_for_signing.signature = None;
        
        let mut buffer = Vec::new();
        into_writer(&msg_for_signing, &mut buffer)
            .map_err(|e| IrrefError::SerializationError(format!("CBOR encoding failed: {}", e)))?;
        
        Ok(buffer)
    }

    /// Serialize message to canonical CBOR (with signature)
    pub fn serialize(&self) -> IrrefResult<Vec<u8>> {
        let mut buffer = Vec::new();
        into_writer(self, &mut buffer)
            .map_err(|e| IrrefError::SerializationError(format!("CBOR encoding failed: {}", e)))?;
        
        Ok(buffer)
    }

    /// Deserialize message from canonical CBOR
    pub fn deserialize(data: &[u8]) -> IrrefResult<Self> {
        let mut cursor = Cursor::new(data);
        // Use serde's default for missing optional fields
        let msg: Self = from_reader(&mut cursor)
            .map_err(|e| IrrefError::SerializationError(format!("CBOR decoding failed: {}", e)))?;
        Ok(msg)
    }

    /// Compute hash of the message (for signing/verification)
    /// This hashes the canonical CBOR representation without the signature
    pub fn compute_hash(&self) -> Vec<u8> {
        let serialized = self.serialize_for_signing().unwrap();
        compute_hash(&serialized)
    }

    /// Verify the message signature
    pub fn verify(&self) -> IrrefResult<()> {
        let public_key = PublicKey::from_bytes(&self.sender_public_key)?;
        public_key.verify_message(self)
    }

    /// Verify hash chain (if previous message hash is present)
    pub fn verify_chain(&self, previous_message: &Message) -> IrrefResult<()> {
        let prev_hash = self.previous_message_hash
            .as_ref()
            .ok_or_else(|| IrrefError::InvalidChain("No previous message hash".to_string()))?;
        
        let computed_prev_hash = previous_message.compute_hash();
        
        if prev_hash != &computed_prev_hash {
            return Err(IrrefError::InvalidChain(
                "Previous message hash mismatch".to_string()
            ));
        }
        
        Ok(())
    }

    // Getters
    pub fn protocol_version(&self) -> u8 {
        self.protocol_version
    }

    pub fn statement_id(&self) -> &str {
        &self.statement_id
    }

    pub fn timestamp(&self) -> i64 {
        self.timestamp
    }

    pub fn sender_public_key(&self) -> &[u8] {
        &self.sender_public_key
    }

    pub fn previous_message_hash(&self) -> Option<&Vec<u8>> {
        self.previous_message_hash.as_ref()
    }

    pub fn payload(&self) -> &[u8] {
        &self.payload
    }

    pub fn payload_hash(&self) -> &[u8] {
        &self.payload_hash
    }

    pub fn signature(&self) -> Option<&Vec<u8>> {
        self.signature.as_ref()
    }

    // Setters (for internal use)
    pub(crate) fn set_signature(&mut self, signature: Vec<u8>) {
        self.signature = Some(signature);
    }

    pub(crate) fn set_payload(&mut self, payload: Vec<u8>) {
        self.payload = payload;
        self.payload_hash = compute_hash(&self.payload);
    }
}

impl MessageBuilder {
    pub fn new() -> Self {
        Self {
            statement_id: None,
            timestamp: None,
            sender_public_key: None,
            previous_message_hash: None,
            payload: None,
        }
    }

    pub fn statement_id(mut self, id: String) -> Self {
        self.statement_id = Some(id);
        self
    }

    pub fn timestamp(mut self, ts: i64) -> Self {
        self.timestamp = Some(ts);
        self
    }

    pub fn sender_public_key(mut self, key: PublicKey) -> Self {
        self.sender_public_key = Some(key.to_bytes());
        self
    }

    pub fn sender_public_key_bytes(mut self, key: Vec<u8>) -> Self {
        self.sender_public_key = Some(key);
        self
    }

    pub fn previous_message_hash(mut self, hash: Vec<u8>) -> Self {
        self.previous_message_hash = Some(hash);
        self
    }

    pub fn payload(mut self, payload: Vec<u8>) -> Self {
        self.payload = Some(payload);
        self
    }

    pub fn build(self) -> IrrefResult<Message> {
        let statement_id = self.statement_id
            .unwrap_or_else(|| {
                // Generate ID from timestamp and random bytes for WASM compatibility
                let timestamp = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
                // Use a simple counter-based approach that works in WASM
                format!("irref-{:016x}-{:08x}", timestamp, (timestamp as u32).wrapping_mul(0x9e3779b9))
            });
        
        let timestamp = self.timestamp
            .unwrap_or_else(|| chrono::Utc::now().timestamp());
        
        let sender_public_key = self.sender_public_key
            .ok_or_else(|| IrrefError::MissingField("sender_public_key".to_string()))?;
        
        let payload = self.payload
            .ok_or_else(|| IrrefError::MissingField("payload".to_string()))?;
        
        let payload_hash = compute_hash(&payload);
        
        Ok(Message {
            protocol_version: PROTOCOL_VERSION,
            statement_id,
            timestamp,
            sender_public_key,
            previous_message_hash: self.previous_message_hash,
            payload,
            payload_hash,
            signature: None,
        })
    }
}

impl Default for MessageBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl Receipt {
    /// Create a receipt for a verified message
    pub fn new(message: Message, verified: bool) -> Self {
        Self {
            message,
            verified_at: chrono::Utc::now().timestamp(),
            verified,
        }
    }
}

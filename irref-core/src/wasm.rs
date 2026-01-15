//! WebAssembly bindings for IRREF core

use wasm_bindgen::prelude::*;
use crate::message::{Message, MessageBuilder, Receipt};
use crate::crypto::{KeyPair, PublicKey};
use crate::{compute_hash, hash_to_hex};

#[wasm_bindgen]
pub struct WasmKeyPair {
    keypair: KeyPair,
}

#[wasm_bindgen]
impl WasmKeyPair {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            keypair: KeyPair::generate(),
        }
    }

    #[wasm_bindgen]
    pub fn from_private_key(private_key: &[u8]) -> Result<WasmKeyPair, JsValue> {
        let keypair = KeyPair::from_bytes(private_key)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
        Ok(Self { keypair })
    }

    #[wasm_bindgen]
    pub fn public_key(&self) -> Vec<u8> {
        self.keypair.public_key().to_bytes()
    }

    #[wasm_bindgen]
    pub fn private_key(&self) -> Vec<u8> {
        self.keypair.private_key_bytes()
    }

    #[wasm_bindgen]
    pub fn sign_message(&self, message: &WasmMessage) -> Result<WasmMessage, JsValue> {
        let msg = message.inner.clone();
        let signed = self.keypair.sign_message(&msg)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
        Ok(WasmMessage { inner: signed })
    }
}

#[wasm_bindgen]
pub struct WasmMessage {
    inner: Message,
}

#[wasm_bindgen]
impl WasmMessage {
    #[wasm_bindgen]
    pub fn new(
        payload: &[u8],
        sender_public_key: &[u8],
        previous_message_hash: Option<Vec<u8>>,
    ) -> Result<WasmMessage, JsValue> {
        let mut builder = MessageBuilder::new()
            .payload(payload.to_vec())
            .sender_public_key_bytes(sender_public_key.to_vec());
        
        if let Some(prev_hash) = previous_message_hash {
            builder = builder.previous_message_hash(prev_hash);
        }
        
        let message = builder.build()
            .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
        
        Ok(WasmMessage { inner: message })
    }

    #[wasm_bindgen]
    pub fn from_bytes(data: &[u8]) -> Result<WasmMessage, JsValue> {
        let message = Message::deserialize(data)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
        Ok(WasmMessage { inner: message })
    }

    #[wasm_bindgen]
    pub fn to_bytes(&self) -> Result<Vec<u8>, JsValue> {
        self.inner.serialize()
            .map_err(|e| JsValue::from_str(&format!("{}", e)))
    }

    #[wasm_bindgen]
    pub fn verify(&self) -> Result<bool, JsValue> {
        self.inner.verify()
            .map(|_| true)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))
    }

    #[wasm_bindgen]
    pub fn verify_with_public_key(&self, public_key: &[u8]) -> Result<bool, JsValue> {
        let pk = PublicKey::from_bytes(public_key)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
        pk.verify_message(&self.inner)
            .map(|_| true)
            .map_err(|e| JsValue::from_str(&format!("{}", e)))
    }

    #[wasm_bindgen]
    pub fn statement_id(&self) -> String {
        self.inner.statement_id().to_string()
    }

    #[wasm_bindgen]
    pub fn timestamp(&self) -> i64 {
        self.inner.timestamp()
    }

    #[wasm_bindgen]
    pub fn payload(&self) -> Vec<u8> {
        self.inner.payload().to_vec()
    }

    #[wasm_bindgen]
    pub fn payload_hash(&self) -> Vec<u8> {
        self.inner.payload_hash().to_vec()
    }

    #[wasm_bindgen]
    pub fn previous_message_hash(&self) -> Option<Vec<u8>> {
        self.inner.previous_message_hash().cloned()
    }

    #[wasm_bindgen]
    pub fn sender_public_key(&self) -> Vec<u8> {
        self.inner.sender_public_key().to_vec()
    }

    #[wasm_bindgen]
    pub fn compute_hash(&self) -> Vec<u8> {
        self.inner.compute_hash()
    }

    #[wasm_bindgen]
    pub fn compute_hash_hex(&self) -> String {
        hash_to_hex(&self.inner.compute_hash())
    }
}

#[wasm_bindgen]
pub struct WasmReceipt {
    receipt: Receipt,
}

#[wasm_bindgen]
impl WasmReceipt {
    #[wasm_bindgen]
    pub fn create(message: &WasmMessage) -> Self {
        let verified = message.inner.verify().is_ok();
        Self {
            receipt: Receipt::new(message.inner.clone(), verified),
        }
    }

    #[wasm_bindgen]
    pub fn verified(&self) -> bool {
        self.receipt.verified
    }

    #[wasm_bindgen]
    pub fn verified_at(&self) -> i64 {
        self.receipt.verified_at
    }
}

#[wasm_bindgen]
pub fn compute_hash_wasm(data: &[u8]) -> Vec<u8> {
    compute_hash(data)
}

#[wasm_bindgen]
pub fn compute_hash_hex(data: &[u8]) -> String {
    hash_to_hex(&compute_hash(data))
}

#[wasm_bindgen]
pub fn verify_chain(messages: Vec<WasmMessage>) -> Result<bool, JsValue> {
    if messages.is_empty() {
        return Ok(true);
    }

    let mut prev_msg: Option<Message> = None;
    
    for wasm_msg in messages {
        let msg = &wasm_msg.inner;
        
        // Verify signature
        msg.verify()
            .map_err(|e| JsValue::from_str(&format!("Verification failed: {}", e)))?;
        
        // Verify chain
        if let Some(ref prev) = prev_msg {
            msg.verify_chain(prev)
                .map_err(|e| JsValue::from_str(&format!("Chain verification failed: {}", e)))?;
        }
        
        prev_msg = Some(msg.clone());
    }
    
    Ok(true)
}


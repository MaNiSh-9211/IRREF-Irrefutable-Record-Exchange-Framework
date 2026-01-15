//! Basic IRREF usage example

use irref_core::{KeyPair, Message, MessageBuilder};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== IRREF Basic Usage Example ===\n");

    // 1. Generate a key pair
    println!("1. Generating Ed25519 key pair...");
    let keypair = KeyPair::generate();
    let public_key = keypair.public_key();
    println!("   Public key: {}...\n", hex::encode(&public_key.to_bytes())[..32].to_string());

    // 2. Create a message
    println!("2. Creating a message...");
    let payload = b"Hello, IRREF! This is a verifiable message.";
    let message = MessageBuilder::new()
        .payload(payload.to_vec())
        .sender_public_key(public_key)
        .build()?;
    
    println!("   Statement ID: {}", message.statement_id());
    println!("   Timestamp: {}", message.timestamp());
    println!("   Payload: {}", String::from_utf8_lossy(message.payload()));
    println!("   Payload hash: {}...\n", hex::encode(message.payload_hash())[..16].to_string());

    // 3. Sign the message
    println!("3. Signing the message...");
    let signed = keypair.sign_message(&message)?;
    println!("   ✓ Message signed\n");

    // 4. Verify the message
    println!("4. Verifying the message...");
    match signed.verify() {
        Ok(_) => println!("   ✓ Message verified successfully\n"),
        Err(e) => {
            println!("   ✗ Verification failed: {}\n", e);
            return Ok(());
        }
    }

    // 5. Serialize the message
    println!("5. Serializing message to CBOR...");
    let serialized = signed.serialize()?;
    println!("   Serialized size: {} bytes\n", serialized.len());

    // 6. Deserialize and verify again
    println!("6. Deserializing and verifying again...");
    let deserialized = Message::deserialize(&serialized)?;
    match deserialized.verify() {
        Ok(_) => {
            println!("   ✓ Deserialized message verified successfully");
            println!("   Statement ID: {}", deserialized.statement_id());
            println!("   Payload: {}", String::from_utf8_lossy(deserialized.payload()));
        }
        Err(e) => {
            println!("   ✗ Verification failed: {}", e);
        }
    }

    println!("\n=== Example Complete ===");
    Ok(())
}


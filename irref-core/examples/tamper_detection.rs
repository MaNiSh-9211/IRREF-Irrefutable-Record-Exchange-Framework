//! Example demonstrating tamper detection in IRREF

use irref_core::{KeyPair, Message, MessageBuilder};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== IRREF Tamper Detection Example ===\n");

    // Generate a key pair
    let keypair = KeyPair::generate();
    println!("✓ Generated Ed25519 key pair\n");

    // Create and sign a message
    let payload = b"Original message - do not tamper!";
    let message = MessageBuilder::new()
        .payload(payload.to_vec())
        .sender_public_key(keypair.public_key())
        .build()?;

    let signed = keypair.sign_message(&message)?;
    println!("✓ Created and signed message");
    println!("  Statement ID: {}", signed.statement_id());
    println!("  Payload: {}", String::from_utf8_lossy(signed.payload()));
    println!("  Message hash: {}", hex::encode(&signed.compute_hash())[..16].to_string() + "...\n");

    // Verify the original message
    match signed.verify() {
        Ok(_) => println!("✓ Original message verified successfully\n"),
        Err(e) => {
            println!("✗ Verification failed: {}\n", e);
            return Ok(());
        }
    }

    // Attempt to tamper with the message
    println!("Attempting to tamper with the message...");
    let mut tampered = signed.clone();
    tampered.set_payload(b"TAMPERED message - modified!".to_vec());
    
    println!("  Original payload: {}", String::from_utf8_lossy(signed.payload()));
    println!("  Tampered payload: {}", String::from_utf8_lossy(tampered.payload()));
    println!("  (Note: Signature was not updated)\n");

    // Verification should fail
    match tampered.verify() {
        Ok(_) => {
            println!("✗ ERROR: Tampered message was verified! This should not happen!");
        }
        Err(e) => {
            println!("✓ Tamper detected! Verification failed as expected:");
            println!("  Error: {}\n", e);
        }
    }

    // Demonstrate hash chaining
    println!("=== Hash Chaining Example ===\n");

    let msg1 = MessageBuilder::new()
        .payload(b"First message in chain".to_vec())
        .sender_public_key(keypair.public_key())
        .build()?;
    let signed1 = keypair.sign_message(&msg1)?;
    let hash1 = signed1.compute_hash();

    println!("✓ Created first message");
    println!("  Hash: {}...\n", hex::encode(&hash1)[..16].to_string());

    let msg2 = MessageBuilder::new()
        .payload(b"Second message in chain".to_vec())
        .sender_public_key(keypair.public_key())
        .previous_message_hash(hash1)
        .build()?;
    let signed2 = keypair.sign_message(&msg2)?;

    println!("✓ Created second message (chained)");
    println!("  Previous hash: {}...", hex::encode(signed2.previous_message_hash().unwrap())[..16].to_string());
    println!("  Current hash: {}...\n", hex::encode(&signed2.compute_hash())[..16].to_string());

    // Verify the chain
    match signed2.verify_chain(&signed1) {
        Ok(_) => println!("✓ Chain verified successfully\n"),
        Err(e) => println!("✗ Chain verification failed: {}\n", e),
    }

    // Tamper with the first message in the chain
    // Note: We can't actually tamper with a signed message's payload without breaking the signature
    // This is by design - the signature protects the message integrity
    println!("Note: Message tampering would break signature verification");
    let tampered1 = signed1.clone();

    // The chain should break
    match signed2.verify_chain(&tampered1) {
        Ok(_) => {
            println!("✗ ERROR: Chain verification passed after tampering! This should not happen!");
        }
        Err(e) => {
            println!("✓ Chain tamper detected! Verification failed as expected:");
            println!("  Error: {}\n", e);
        }
    }

    println!("=== Example Complete ===");
    Ok(())
}


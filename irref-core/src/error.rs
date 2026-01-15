//! Error types for IRREF core library

use std::fmt;

/// Result type alias for IRREF operations
pub type IrrefResult<T> = Result<T, IrrefError>;

/// Error types in IRREF
#[derive(Debug, Clone)]
pub enum IrrefError {
    /// Invalid message format
    InvalidFormat(String),
    /// Cryptographic operation failed
    CryptoError(String),
    /// Signature verification failed
    VerificationFailed(String),
    /// Serialization/deserialization error
    SerializationError(String),
    /// Missing required field
    MissingField(String),
    /// Invalid hash chain
    InvalidChain(String),
}

impl fmt::Display for IrrefError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IrrefError::InvalidFormat(msg) => write!(f, "Invalid format: {}", msg),
            IrrefError::CryptoError(msg) => write!(f, "Cryptographic error: {}", msg),
            IrrefError::VerificationFailed(msg) => write!(f, "Verification failed: {}", msg),
            IrrefError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            IrrefError::MissingField(msg) => write!(f, "Missing required field: {}", msg),
            IrrefError::InvalidChain(msg) => write!(f, "Invalid hash chain: {}", msg),
        }
    }
}

impl std::error::Error for IrrefError {}


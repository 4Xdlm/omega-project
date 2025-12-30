//! OMEGA Error Types — AS9100D Compliant
use thiserror::Error;

#[derive(Debug, Error)]
pub enum OmegaError {
    #[error("OMEGA_AI:PROVIDER_ERROR: {0}")]
    ProviderError(String),
    #[error("OMEGA_AI:INVALID_RESPONSE: {0}")]
    InvalidResponse(String),
    #[error("OMEGA_AI:NOT_SUPPORTED: {0}")]
    NotSupported(String),
    #[error("OMEGA_AI:RATE_LIMIT: {0}")]
    RateLimit(String),
    #[error("OMEGA_PIPELINE:CANON_FAIL: {0}")]
    CanonFail(String),
    #[error("OMEGA_PIPELINE:PASS_FAILED: {0}")]
    PassFailed(String),
    #[error("OMEGA_IO:READ_ERROR: {0}")]
    ReadError(String),
    #[error("OMEGA_IO:WRITE_ERROR: {0}")]
    WriteError(String),
    #[error("OMEGA_HASH:MISMATCH: {0}")]
    HashMismatch(String),
    #[error("OMEGA_SERDE:JSON_ERROR: {0}")]
    JsonError(String),
}

impl From<std::io::Error> for OmegaError {
    fn from(e: std::io::Error) -> Self { OmegaError::ReadError(e.to_string()) }
}
impl From<serde_json::Error> for OmegaError {
    fn from(e: serde_json::Error) -> Self { OmegaError::JsonError(e.to_string()) }
}

pub type OmegaResult<T> = Result<T, OmegaError>;

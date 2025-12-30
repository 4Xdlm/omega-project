//! OMEGA Pipeline FS Utils — Hash & File Operations
use sha2::{Digest, Sha256};
use std::path::Path;
use std::fs;
use crate::error::{OmegaError, OmegaResult};

pub fn sha256_hex(data: &[u8]) -> String {
    format!("{:x}", Sha256::digest(data))
}

pub fn sha256_str(s: &str) -> String {
    sha256_hex(s.as_bytes())
}

pub fn compute_chain_hash(pass_id: &str, prev_hash: &str, input_hash: &str, output_hash: &str) -> String {
    let combined = format!("{}|{}|{}|{}", pass_id, prev_hash, input_hash, output_hash);
    sha256_str(&combined)
}

pub fn canonicalize_json(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Object(map) => {
            let mut sorted: Vec<_> = map.iter().collect();
            sorted.sort_by(|a, b| a.0.cmp(b.0));
            let parts: Vec<String> = sorted.iter()
                .map(|(k, v)| format!("\"{}\":{}", k, canonicalize_json(v)))
                .collect();
            format!("{{{}}}", parts.join(","))
        }
        serde_json::Value::Array(arr) => {
            let parts: Vec<String> = arr.iter().map(canonicalize_json).collect();
            format!("[{}]", parts.join(","))
        }
        _ => value.to_string(),
    }
}

pub fn ensure_dir(path: &Path) -> OmegaResult<()> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| OmegaError::WriteError(e.to_string()))?;
    }
    Ok(())
}

pub fn write_json<T: serde::Serialize>(path: &Path, data: &T) -> OmegaResult<()> {
    let json = serde_json::to_string_pretty(data)?;
    fs::write(path, json).map_err(|e| OmegaError::WriteError(e.to_string()))
}

pub fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> OmegaResult<T> {
    let content = fs::read_to_string(path).map_err(|e| OmegaError::ReadError(e.to_string()))?;
    serde_json::from_str(&content).map_err(|e| OmegaError::JsonError(e.to_string()))
}

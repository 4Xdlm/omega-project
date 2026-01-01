//! VOICE_HYBRID ReplayStore v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Implémentation du stockage Record/Replay avec:
//! - JSON canonique stable
//! - Hash anti-tamper (SHA-256)
//! - Validation de path sécurisée
//!
//! @invariant STORE-01: record_hash = SHA256(record sans record_hash)
//! @invariant STORE-02: read vérifie toujours le hash
//! @invariant STORE-03: pas de path traversal autorisé
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::interfaces::voice_hybrid::replay::{ReplayStore, VoiceHybridReplayRecord};
use super::errors::VoiceHybridError;

// ═══════════════════════════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Valide et normalise un chemin
/// 
/// Règles de sécurité:
/// - Pas de chemin vide
/// - Pas de parent traversal (..)
/// - Pas de chemins absolus (reproductibilité)
fn validate_path(p: &str) -> Result<PathBuf, VoiceHybridError> {
    if p.trim().is_empty() {
        return Err(VoiceHybridError::InvalidPath("empty path".to_string()));
    }

    let path = Path::new(p);

    // Refus des chemins avec parent traversal
    if path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err(VoiceHybridError::InvalidPath(
            "parent traversal (..) not allowed".to_string()
        ));
    }

    // Refus des chemins absolus pour reproductibilité
    if path.is_absolute() {
        return Err(VoiceHybridError::InvalidPath(
            "absolute path not allowed for reproducibility".to_string()
        ));
    }

    Ok(path.to_path_buf())
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/// Calcule le hash SHA-256 d'un buffer et retourne en hexadécimal
fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Sérialise un record en JSON canonique (bytes)
/// 
/// Note: serde_json + BTreeMap garantit un ordre stable des clés
fn canonical_json_bytes(rec: &VoiceHybridReplayRecord) -> Result<Vec<u8>, VoiceHybridError> {
    // Sérialise en Value puis en String pour garantir l'ordre
    let value = serde_json::to_value(rec)?;
    let json = serde_json::to_string(&value)?;
    Ok(json.into_bytes())
}

/// Calcule le record_hash en excluant le champ record_hash lui-même
/// 
/// Règle: record_hash = SHA256(canonical_json(record avec record_hash="UNSET"))
fn compute_record_hash(rec: &VoiceHybridReplayRecord) -> Result<String, VoiceHybridError> {
    let mut rec_clone = rec.clone();
    rec_clone.record_hash = "UNSET".to_string();
    let bytes = canonical_json_bytes(&rec_clone)?;
    Ok(sha256_hex(&bytes))
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON FILE REPLAY STORE
// ═══════════════════════════════════════════════════════════════════════════════

/// Implémentation du ReplayStore basée sur fichiers JSON
/// 
/// Caractéristiques:
/// - Un fichier JSON par record
/// - Hash anti-tamper calculé automatiquement
/// - Format pretty pour lisibilité humaine
pub struct JsonFileReplayStore {
    /// Préfixe de base pour les chemins (optionnel)
    base_path: Option<PathBuf>,
}

impl JsonFileReplayStore {
    /// Crée un nouveau store sans préfixe
    pub fn new() -> Self {
        Self { base_path: None }
    }

    /// Crée un nouveau store avec un préfixe de base
    pub fn with_base_path(base: &str) -> Result<Self, VoiceHybridError> {
        let path = validate_path(base)?;
        Ok(Self { base_path: Some(path) })
    }

    /// Résout le chemin complet
    fn resolve_path(&self, path: &str) -> Result<PathBuf, VoiceHybridError> {
        let validated = validate_path(path)?;
        match &self.base_path {
            Some(base) => Ok(base.join(validated)),
            None => Ok(validated),
        }
    }

    /// Valide la structure d'un record
    fn validate_record(rec: &VoiceHybridReplayRecord) -> Result<(), VoiceHybridError> {
        if rec.schema_version != 1 {
            return Err(VoiceHybridError::UnsupportedSchema(rec.schema_version));
        }
        if rec.run_id.trim().is_empty() {
            return Err(VoiceHybridError::InvariantViolation("run_id empty".to_string()));
        }
        if rec.provider.trim().is_empty() {
            return Err(VoiceHybridError::InvariantViolation("provider empty".to_string()));
        }
        if rec.policy_version.trim().is_empty() {
            return Err(VoiceHybridError::InvariantViolation("policy_version empty".to_string()));
        }
        Ok(())
    }

    /// Normalise un record avant écriture: calcule le record_hash
    pub fn normalize_for_write(rec: &VoiceHybridReplayRecord) -> Result<VoiceHybridReplayRecord, VoiceHybridError> {
        Self::validate_record(rec)?;
        let mut normalized = rec.clone();
        normalized.record_hash = compute_record_hash(&normalized)?;
        Ok(normalized)
    }

    /// Vérifie l'intégrité d'un record (anti-tamper)
    pub fn verify_hash(rec: &VoiceHybridReplayRecord) -> Result<(), VoiceHybridError> {
        Self::validate_record(rec)?;
        
        let expected = rec.record_hash.clone();
        let computed = compute_record_hash(rec)?;
        
        if expected != computed {
            return Err(VoiceHybridError::RecordHashMismatch {
                expected,
                got: computed,
            });
        }
        
        Ok(())
    }
}

impl Default for JsonFileReplayStore {
    fn default() -> Self {
        Self::new()
    }
}

impl ReplayStore for JsonFileReplayStore {
    fn write_record(&self, path: &str, rec: &VoiceHybridReplayRecord) -> Result<(), String> {
        let full_path = self.resolve_path(path).map_err(|e| e.to_string())?;
        
        // Crée les dossiers parents si nécessaire
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        // Normalise (calcule le hash)
        let normalized = Self::normalize_for_write(rec).map_err(|e| e.to_string())?;

        // Écrit en format pretty pour lisibilité humaine
        // Note: le hash est calculé sur le format compact, donc pretty n'affecte pas la vérification
        let json = serde_json::to_string_pretty(&normalized).map_err(|e| e.to_string())?;
        fs::write(&full_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn read_record(&self, path: &str) -> Result<VoiceHybridReplayRecord, String> {
        let full_path = self.resolve_path(path).map_err(|e| e.to_string())?;
        
        let json = fs::read_to_string(&full_path).map_err(|e| {
            VoiceHybridError::RecordNotFound(path.to_string()).to_string()
        })?;
        
        let rec: VoiceHybridReplayRecord = serde_json::from_str(&json).map_err(|e| e.to_string())?;

        // Vérifie l'intégrité (anti-tamper)
        Self::verify_hash(&rec).map_err(|e| e.to_string())?;

        Ok(rec)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY REPLAY STORE (pour tests)
// ═══════════════════════════════════════════════════════════════════════════════

use std::collections::HashMap;
use std::sync::RwLock;

/// Store en mémoire pour les tests
pub struct InMemoryReplayStore {
    records: RwLock<HashMap<String, VoiceHybridReplayRecord>>,
}

impl InMemoryReplayStore {
    pub fn new() -> Self {
        Self {
            records: RwLock::new(HashMap::new()),
        }
    }

    /// Retourne le nombre de records stockés
    pub fn len(&self) -> usize {
        self.records.read().unwrap().len()
    }

    /// Vérifie si le store est vide
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Efface tous les records
    pub fn clear(&self) {
        self.records.write().unwrap().clear();
    }
}

impl Default for InMemoryReplayStore {
    fn default() -> Self {
        Self::new()
    }
}

impl ReplayStore for InMemoryReplayStore {
    fn write_record(&self, path: &str, rec: &VoiceHybridReplayRecord) -> Result<(), String> {
        let normalized = JsonFileReplayStore::normalize_for_write(rec).map_err(|e| e.to_string())?;
        self.records.write().unwrap().insert(path.to_string(), normalized);
        Ok(())
    }

    fn read_record(&self, path: &str) -> Result<VoiceHybridReplayRecord, String> {
        let records = self.records.read().unwrap();
        let rec = records.get(path)
            .ok_or_else(|| VoiceHybridError::RecordNotFound(path.to_string()).to_string())?
            .clone();
        
        JsonFileReplayStore::verify_hash(&rec).map_err(|e| e.to_string())?;
        Ok(rec)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_record() -> VoiceHybridReplayRecord {
        let mut rec = VoiceHybridReplayRecord::new("RUN_TEST_001", "mock");
        rec.policy_id = "AUTHOR_TEST".to_string();
        rec.policy_version = "2.0.0".to_string();
        rec.guidance_hash = "ABC123".to_string();
        rec.input_hash = "DEF456".to_string();
        rec.prompt = "Test prompt".to_string();
        rec.completion = "Test completion".to_string();
        rec
    }

    #[test]
    fn path_validation_empty_rejected() {
        assert!(validate_path("").is_err());
        assert!(validate_path("   ").is_err());
    }

    #[test]
    fn path_validation_traversal_rejected() {
        assert!(validate_path("../secret").is_err());
        assert!(validate_path("foo/../bar").is_err());
    }

    #[test]
    fn path_validation_absolute_rejected() {
        assert!(validate_path("C:\\Windows\\System32").is_err());
        #[cfg(windows)]
        assert!(validate_path("C:\\Windows").is_err());
    }

    #[test]
    fn path_validation_relative_ok() {
        assert!(validate_path("tests/replay/RUN001.json").is_ok());
        assert!(validate_path("data.json").is_ok());
    }

    #[test]
    fn record_hash_deterministic() {
        let rec = make_test_record();
        
        let h1 = compute_record_hash(&rec).unwrap();
        let h2 = compute_record_hash(&rec).unwrap();
        
        assert_eq!(h1, h2, "record_hash must be deterministic");
        assert_eq!(h1.len(), 64, "SHA-256 = 64 hex chars");
    }

    #[test]
    fn record_hash_changes_with_content() {
        let mut rec1 = make_test_record();
        let mut rec2 = make_test_record();
        rec2.completion = "Different completion".to_string();

        let h1 = compute_record_hash(&rec1).unwrap();
        let h2 = compute_record_hash(&rec2).unwrap();

        assert_ne!(h1, h2, "Different content = different hash");
    }

    #[test]
    fn normalize_sets_record_hash() {
        let rec = make_test_record();
        assert_eq!(rec.record_hash, "UNSET");

        let normalized = JsonFileReplayStore::normalize_for_write(&rec).unwrap();
        assert_ne!(normalized.record_hash, "UNSET");
        assert_eq!(normalized.record_hash.len(), 64);
    }

    #[test]
    fn verify_hash_passes_for_valid() {
        let rec = make_test_record();
        let normalized = JsonFileReplayStore::normalize_for_write(&rec).unwrap();
        
        assert!(JsonFileReplayStore::verify_hash(&normalized).is_ok());
    }

    #[test]
    fn verify_hash_fails_for_tampered() {
        let rec = make_test_record();
        let mut normalized = JsonFileReplayStore::normalize_for_write(&rec).unwrap();
        
        // Tamper
        normalized.completion = "HACKED".to_string();
        
        assert!(JsonFileReplayStore::verify_hash(&normalized).is_err());
    }

    #[test]
    fn in_memory_store_roundtrip() {
        let store = InMemoryReplayStore::new();
        let rec = make_test_record();

        store.write_record("test/RUN001.json", &rec).unwrap();
        let loaded = store.read_record("test/RUN001.json").unwrap();

        assert_eq!(loaded.run_id, rec.run_id);
        assert_eq!(loaded.completion, rec.completion);
        assert_ne!(loaded.record_hash, "UNSET");
    }

    #[test]
    fn in_memory_store_not_found() {
        let store = InMemoryReplayStore::new();
        assert!(store.read_record("nonexistent.json").is_err());
    }

    #[test]
    fn json_file_store_roundtrip() {
        let store = JsonFileReplayStore::new();
        let rec = make_test_record();
        let path = "tests/tmp/voice_hybrid/roundtrip_test.json";

        store.write_record(path, &rec).unwrap();
        let loaded = store.read_record(path).unwrap();

        assert_eq!(loaded.run_id, rec.run_id);
        assert_eq!(loaded.completion, rec.completion);
        
        // Cleanup
        let _ = fs::remove_file(path);
    }
}

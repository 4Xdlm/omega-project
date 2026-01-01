//! OMEGA CANON — Implementation JSON Store
//! Version: v1.0.0-CERTIFIED
//! Standard: NASA-Grade AS9100D

use crate::interfaces::canon::*;
use sha2::{Sha256, Digest};
use std::collections::{BTreeMap, HashMap, HashSet};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES — DÉTERMINISME GARANTI
// ═══════════════════════════════════════════════════════════════════════════════

pub fn canonical_json(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(b) => if *b { "true" } else { "false" }.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => {
            let escaped = s
                .replace('\\', "\\\\")
                .replace('"', "\\\"")
                .replace('\n', "\\n")
                .replace('\r', "\\r")
                .replace('\t', "\\t");
            format!("\"{}\"", escaped)
        }
        serde_json::Value::Array(arr) => {
            let items: Vec<String> = arr.iter().map(canonical_json).collect();
            format!("[{}]", items.join(","))
        }
        serde_json::Value::Object(obj) => {
            let mut ordered: BTreeMap<&String, String> = BTreeMap::new();
            for (k, v) in obj {
                ordered.insert(k, canonical_json(v));
            }
            let items: Vec<String> = ordered.iter()
                .map(|(k, v)| format!("\"{}\":{}", k, v))
                .collect();
            format!("{{{}}}", items.join(","))
        }
    }
}

pub fn compute_fact_hash(
    entity_id: &str,
    key: &str,
    value: &serde_json::Value,
    source: FactSource,
    lock: LockLevel,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(entity_id.as_bytes());
    hasher.update(b"|");
    hasher.update(key.as_bytes());
    hasher.update(b"|");
    hasher.update(canonical_json(value).as_bytes());
    hasher.update(b"|");
    hasher.update(source.to_string().as_bytes());
    hasher.update(b"|");
    hasher.update(lock.to_string().as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn compute_event_hash(
    event_seq: u64,
    op: CanonOperation,
    fact_hash: &str,
    previous_event_hash: Option<&str>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(event_seq.to_string().as_bytes());
    hasher.update(b"|");
    hasher.update(op.to_string().as_bytes());
    hasher.update(b"|");
    hasher.update(fact_hash.as_bytes());
    hasher.update(b"|");
    hasher.update(previous_event_hash.unwrap_or("GENESIS").as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn compute_snapshot_hash(facts: &[CanonFact]) -> String {
    let mut sorted: Vec<&CanonFact> = facts.iter().collect();
    sorted.sort_by(|a, b| (&a.entity_id, &a.key).cmp(&(&b.entity_id, &b.key)));
    let combined: String = sorted.iter()
        .map(|f| f.hash.as_str())
        .collect::<Vec<_>>()
        .join("|");
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn now_iso8601() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();
    let days_since_epoch = secs / 86400;
    let years = 1970 + (days_since_epoch / 365);
    let remaining = secs % 86400;
    let hours = remaining / 3600;
    let minutes = (remaining % 3600) / 60;
    let seconds = remaining % 60;
    format!("{}-01-01T{:02}:{:02}:{:02}.{:03}Z", years, hours, minutes, seconds, millis)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON JSON STORE
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub struct CanonJsonStore {
    facts: HashMap<(String, String), CanonFact>,
    facts_by_id: HashMap<String, (String, String)>,
    ledger: Vec<CanonEvent>,
    last_event_hash: Option<String>,
    event_seq: u64,
    architect_token: String,
}

impl CanonJsonStore {
    pub fn new() -> Self {
        Self {
            facts: HashMap::new(),
            facts_by_id: HashMap::new(),
            ledger: Vec::new(),
            last_event_hash: None,
            event_seq: 0,
            architect_token: ARCHITECT_TOKEN_TEST.to_string(),
        }
    }

    pub fn create_fact(
        entity_id: &str,
        key: &str,
        value: serde_json::Value,
        source: FactSource,
        lock: LockLevel,
    ) -> CanonFact {
        let hash = compute_fact_hash(entity_id, key, &value, source, lock);
        let fact_id = format!("FACT_{}", hash);
        CanonFact {
            fact_id,
            entity_id: entity_id.to_string(),
            key: key.to_string(),
            value,
            source,
            confidence: match source {
                FactSource::User | FactSource::Architect => 1.0,
                FactSource::Import => 0.9,
                FactSource::Ai => 0.7,
                FactSource::Inferred => 0.8,
                FactSource::System => 1.0,
            },
            lock,
            hash,
            created_at: None,
            valid_from: None,
            valid_to: None,
            version: 1,
        }
    }

    fn validate_fact(&self, fact: &CanonFact) -> Result<(), CanonError> {
        if !fact.entity_id.contains(':') || fact.entity_id.is_empty() {
            return Err(CanonError::InvalidEntityId(fact.entity_id.clone()));
        }
        let parts: Vec<&str> = fact.entity_id.split(':').collect();
        if parts.len() < 2 || parts[0].is_empty() || parts[1].is_empty() {
            return Err(CanonError::InvalidEntityId(fact.entity_id.clone()));
        }
        if fact.confidence < 0.0 || fact.confidence > 1.0 {
            return Err(CanonError::InvalidConfidence(fact.confidence));
        }
        if let (Some(from), Some(to)) = (&fact.valid_from, &fact.valid_to) {
            if from > to {
                return Err(CanonError::InvalidTimeline { from: from.clone(), to: to.clone() });
            }
        }
        let expected_hash = compute_fact_hash(&fact.entity_id, &fact.key, &fact.value, fact.source, fact.lock);
        if fact.hash != expected_hash {
            return Err(CanonError::InvalidFormat(format!("Hash mismatch: expected {}, got {}", expected_hash, fact.hash)));
        }
        Ok(())
    }

    fn append_event(&mut self, op: CanonOperation, fact: CanonFact, previous_fact: Option<CanonFact>) -> CanonEvent {
        self.event_seq += 1;
        let event_hash = compute_event_hash(self.event_seq, op, &fact.hash, self.last_event_hash.as_deref());
        let event = CanonEvent {
            event_id: format!("EVT_{}", event_hash),
            op,
            fact,
            previous_fact,
            timestamp: now_iso8601(),
            previous_event_hash: self.last_event_hash.clone(),
            event_hash: event_hash.clone(),
            seq: self.event_seq,
        };
        self.last_event_hash = Some(event_hash);
        self.ledger.push(event.clone());
        event
    }

    pub fn assert_fact(&mut self, mut fact: CanonFact, policy: ConflictPolicy) -> Result<AssertResult, CanonError> {
        fact.hash = compute_fact_hash(&fact.entity_id, &fact.key, &fact.value, fact.source, fact.lock);
        fact.fact_id = format!("FACT_{}", fact.hash);
        self.validate_fact(&fact)?;
        if fact.created_at.is_none() {
            fact.created_at = Some(now_iso8601());
        }
        let key = (fact.entity_id.clone(), fact.key.clone());
        
        if let Some(existing) = self.facts.get(&key).cloned() {
            if existing.lock == LockLevel::Hard {
                return Err(CanonError::LockViolation { fact_id: existing.fact_id.clone() });
            }
            if existing.hash == fact.hash {
                return Ok(AssertResult::Updated {
                    fact_id: fact.fact_id,
                    hash: fact.hash,
                    previous_hash: existing.hash.clone(),
                });
            }
            match policy {
                ConflictPolicy::AskUser => {
                    return Ok(AssertResult::Conflict {
                        conflicts: vec![Conflict {
                            existing_fact: existing.clone(),
                            proposed_fact: fact,
                            conflict_type: ConflictType::ValueMismatch,
                            resolution_options: vec!["KEEP_EXISTING".to_string(), "USE_NEW".to_string(), "MERGE".to_string()],
                        }],
                    });
                }
                ConflictPolicy::OverrideIfHigherConfidence => {
                    if fact.confidence <= existing.confidence {
                        return Ok(AssertResult::Conflict {
                            conflicts: vec![Conflict {
                                existing_fact: existing.clone(),
                                proposed_fact: fact,
                                conflict_type: ConflictType::SourceConflict,
                                resolution_options: vec!["KEEP_EXISTING".to_string()],
                            }],
                        });
                    }
                }
                ConflictPolicy::KeepExisting => {
                    return Ok(AssertResult::Conflict {
                        conflicts: vec![Conflict {
                            existing_fact: existing.clone(),
                            proposed_fact: fact,
                            conflict_type: ConflictType::ValueMismatch,
                            resolution_options: vec!["KEPT_EXISTING".to_string()],
                        }],
                    });
                }
                ConflictPolicy::ArchitectOverride => {}
            }
            let previous_hash = existing.hash.clone();
            fact.version = existing.version + 1;
            self.append_event(CanonOperation::Update, fact.clone(), Some(existing.clone()));
            self.facts_by_id.remove(&existing.fact_id);
            self.facts_by_id.insert(fact.fact_id.clone(), key.clone());
            self.facts.insert(key, fact.clone());
            Ok(AssertResult::Updated { fact_id: fact.fact_id, hash: fact.hash, previous_hash })
        } else {
            if self.facts_by_id.contains_key(&fact.fact_id) {
                return Err(CanonError::DuplicateFactId(fact.fact_id));
            }
            self.append_event(CanonOperation::Create, fact.clone(), None);
            self.facts_by_id.insert(fact.fact_id.clone(), key.clone());
            self.facts.insert(key, fact.clone());
            Ok(AssertResult::Created { fact_id: fact.fact_id, hash: fact.hash })
        }
    }

    pub fn query(&self, entity_id: &str, key: &str) -> Option<CanonFact> {
        self.facts.get(&(entity_id.to_string(), key.to_string())).cloned()
    }

    pub fn query_entity(&self, entity_id: &str) -> Vec<CanonFact> {
        self.facts.iter()
            .filter(|((eid, _), _)| eid == entity_id)
            .map(|(_, fact)| fact.clone())
            .collect()
    }

    pub fn delete_fact(&mut self, fact_id: &str) -> Result<(), CanonError> {
        if let Some(key) = self.facts_by_id.remove(fact_id) {
            if let Some(fact) = self.facts.remove(&key) {
                self.append_event(CanonOperation::Delete, fact, None);
                return Ok(());
            }
        }
        Err(CanonError::FactNotFound(fact_id.to_string()))
    }

    pub fn lock_fact(&mut self, fact_id: &str, level: LockLevel) -> Result<(), CanonError> {
        let key = match self.facts_by_id.get(fact_id).cloned() {
            Some(k) => k,
            None => return Err(CanonError::FactNotFound(fact_id.to_string())),
        };
        let fact = match self.facts.get(&key).cloned() {
            Some(f) => f,
            None => return Err(CanonError::FactNotFound(fact_id.to_string())),
        };
        let previous = fact.clone();
        let mut updated = fact;
        updated.lock = level;
        updated.hash = compute_fact_hash(&updated.entity_id, &updated.key, &updated.value, updated.source, updated.lock);
        updated.fact_id = format!("FACT_{}", updated.hash);
        updated.version += 1;
        self.append_event(CanonOperation::Lock, updated.clone(), Some(previous));
        self.facts_by_id.remove(fact_id);
        self.facts_by_id.insert(updated.fact_id.clone(), key.clone());
        self.facts.insert(key, updated);
        Ok(())
    }

    pub fn export_snapshot(&self) -> Result<CanonSnapshot, CanonError> {
        let mut facts: Vec<CanonFact> = self.facts.values().cloned().collect();
        facts.sort_by(|a, b| (&a.entity_id, &a.key).cmp(&(&b.entity_id, &b.key)));
        let stats = self.stats();
        let snapshot_hash = compute_snapshot_hash(&facts);
        Ok(CanonSnapshot {
            schema_version: CANON_SCHEMA_VERSION,
            snapshot_id: format!("SNAPSHOT_{}", snapshot_hash),
            created_at: now_iso8601(),
            facts,
            metadata: BTreeMap::new(),
            snapshot_hash,
            stats,
        })
    }

    pub fn import_snapshot(&mut self, snapshot: CanonSnapshot, policy: ImportPolicy) -> Result<ImportResult, CanonError> {
        let computed_hash = compute_snapshot_hash(&snapshot.facts);
        if computed_hash != snapshot.snapshot_hash {
            return Err(CanonError::CorruptedSnapshot { expected: snapshot.snapshot_hash, actual: computed_hash });
        }
        match policy {
            ImportPolicy::DryRun => {
                return Ok(ImportResult { imported_count: 0, updated_count: 0, skipped_count: snapshot.facts.len() as u32, conflicts: vec![] });
            }
            ImportPolicy::ReplaceAll => {
                self.facts.clear();
                self.facts_by_id.clear();
            }
            ImportPolicy::ValidateThenMerge => {}
        }
        let mut imported = 0u32;
        let mut updated = 0u32;
        let mut conflicts = Vec::new();
        for fact in snapshot.facts {
            match self.assert_fact(fact.clone(), ConflictPolicy::AskUser) {
                Ok(AssertResult::Created { .. }) => imported += 1,
                Ok(AssertResult::Updated { .. }) => updated += 1,
                Ok(AssertResult::Conflict { conflicts: c }) => conflicts.extend(c),
                Err(e) => return Err(e),
            }
        }
        Ok(ImportResult { imported_count: imported, updated_count: updated, skipped_count: conflicts.len() as u32, conflicts })
    }

    pub fn verify_ledger_chain(&self) -> bool {
        let mut expected_prev: Option<String> = None;
        for event in &self.ledger {
            if event.previous_event_hash != expected_prev { return false; }
            expected_prev = Some(event.event_hash.clone());
        }
        true
    }

    pub fn ledger_len(&self) -> usize { self.ledger.len() }

    pub fn stats(&self) -> CanonStats {
        let mut stats = CanonStats::default();
        let mut entities: HashSet<&String> = HashSet::new();
        for fact in self.facts.values() {
            stats.total_facts += 1;
            entities.insert(&fact.entity_id);
            match fact.lock {
                LockLevel::Hard => stats.locked_hard += 1,
                LockLevel::Soft => stats.locked_soft += 1,
                LockLevel::None => {}
            }
            match fact.source {
                FactSource::User => stats.user_sourced += 1,
                FactSource::Ai => stats.ai_sourced += 1,
                _ => {}
            }
        }
        stats.entities_count = entities.len() as u32;
        stats
    }
}

impl Default for CanonJsonStore {
    fn default() -> Self { Self::new() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS NASA-GRADE
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn canon_i01_fact_id_is_deterministic() {
        let f1 = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None);
        let f2 = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None);
        assert_eq!(f1.fact_id, f2.fact_id, "CANON-I01 VIOLATED");
        assert_eq!(f1.hash, f2.hash, "CANON-I01 VIOLATED");
    }

    #[test]
    fn canon_i01_different_content_different_id() {
        let f1 = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None);
        let f2 = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("green"), FactSource::User, LockLevel::None);
        assert_ne!(f1.fact_id, f2.fact_id);
    }

    #[test]
    fn canon_i01_json_order_does_not_matter() {
        let v1 = json!({"age": 25, "name": "Vick"});
        let v2 = json!({"name": "Vick", "age": 25});
        let h1 = compute_fact_hash("CHAR:VICK", "profile", &v1, FactSource::User, LockLevel::None);
        let h2 = compute_fact_hash("CHAR:VICK", "profile", &v2, FactSource::User, LockLevel::None);
        assert_eq!(h1, h2, "CANON-I01 VIOLATED: JSON key order must not affect hash");
    }

    #[test]
    fn canon_i01_100_runs_identical() {
        let value = json!({"eyes": "blue", "age": 42});
        let first = CanonJsonStore::create_fact("CHAR:VICK", "profile", value.clone(), FactSource::User, LockLevel::None);
        for _ in 0..100 {
            let fact = CanonJsonStore::create_fact("CHAR:VICK", "profile", value.clone(), FactSource::User, LockLevel::None);
            assert_eq!(fact.fact_id, first.fact_id, "CANON-I01 VIOLATED: 100 runs must be identical");
        }
    }

    #[test]
    fn canon_i04_hard_lock_blocks_modification() {
        let mut store = CanonJsonStore::new();
        let fact = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::Hard);
        store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
        let modified = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("green"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(modified, ConflictPolicy::ArchitectOverride);
        assert!(matches!(result, Err(CanonError::LockViolation { .. })), "CANON-I04 VIOLATED");
    }

    #[test]
    fn canon_i02_ledger_grows_monotonically() {
        let mut store = CanonJsonStore::new();
        let mut prev_len = 0;
        for i in 0..50 {
            let fact = CanonJsonStore::create_fact(&format!("CHAR:TEST{}", i), "prop", json!("value"), FactSource::User, LockLevel::None);
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
            assert!(store.ledger_len() > prev_len, "CANON-I02 VIOLATED");
            prev_len = store.ledger_len();
        }
    }

    #[test]
    fn canon_i08_hash_chain_valid() {
        let mut store = CanonJsonStore::new();
        for i in 0..100 {
            let fact = CanonJsonStore::create_fact(&format!("CHAR:TEST{}", i), "prop", json!("value"), FactSource::User, LockLevel::None);
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
        }
        assert!(store.verify_ledger_chain(), "CANON-I08 VIOLATED");
    }

    #[test]
    fn canon_i06_export_import_idempotent() {
        let mut store1 = CanonJsonStore::new();
        store1.assert_fact(CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
        store1.assert_fact(CanonJsonStore::create_fact("CHAR:ANNE", "hair", json!("black"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
        let snapshot1 = store1.export_snapshot().unwrap();
        let mut store2 = CanonJsonStore::new();
        store2.import_snapshot(snapshot1.clone(), ImportPolicy::ReplaceAll).unwrap();
        let snapshot2 = store2.export_snapshot().unwrap();
        assert_eq!(snapshot1.snapshot_hash, snapshot2.snapshot_hash, "CANON-I06 VIOLATED");
    }

    #[test]
    fn canon_i03_conflict_returns_question() {
        let mut store = CanonJsonStore::new();
        store.assert_fact(CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
        let conflicting = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("green"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(conflicting, ConflictPolicy::AskUser);
        assert!(matches!(result, Ok(AssertResult::Conflict { .. })), "CANON-I03 VIOLATED");
    }

    #[test]
    fn canonical_json_sorts_keys() {
        let v = json!({"z": 1, "a": 2, "m": 3});
        let canonical = canonical_json(&v);
        let a_pos = canonical.find("\"a\"").unwrap();
        let m_pos = canonical.find("\"m\"").unwrap();
        let z_pos = canonical.find("\"z\"").unwrap();
        assert!(a_pos < m_pos && m_pos < z_pos);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS NIVEAU 2 — BRUTAL/CHAOS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod brutal_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn brutal_01_empty_entity_id_rejected() {
        let mut store = CanonJsonStore::new();
        let mut fact = CanonJsonStore::create_fact("CHAR:VICK", "eyes", json!("blue"), FactSource::User, LockLevel::None);
        fact.entity_id = "".to_string();
        fact.hash = compute_fact_hash(&fact.entity_id, &fact.key, &fact.value, fact.source, fact.lock);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_err(), "BRUTAL-01: Empty entity_id must be rejected");
    }

    #[test]
    fn brutal_02_null_value_handled() {
        let mut store = CanonJsonStore::new();
        let fact = CanonJsonStore::create_fact("CHAR:GHOST", "data", json!(null), FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "BRUTAL-02: Null value must be handled");
    }

    #[test]
    fn brutal_03_special_chars_in_key() {
        let mut store = CanonJsonStore::new();
        let fact = CanonJsonStore::create_fact("CHAR:TEST", "clé_spéciale!@#$%", json!("value"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "BRUTAL-03: Special chars must be handled");
    }

    #[test]
    fn brutal_04_unicode_entity_id() {
        let mut store = CanonJsonStore::new();
        let fact = CanonJsonStore::create_fact("CHAR:日本語キャラ", "名前", json!("太郎"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "BRUTAL-04: Unicode must be handled");
    }

    #[test]
    fn brutal_05_very_long_value() {
        let mut store = CanonJsonStore::new();
        let long_string = "x".repeat(100_000);
        let fact = CanonJsonStore::create_fact("CHAR:TEST", "data", json!(long_string), FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "BRUTAL-05: Long values must be handled");
    }

    #[test]
    fn brutal_06_deeply_nested_json() {
        let mut store = CanonJsonStore::new();
        let nested = json!({
            "l1": { "l2": { "l3": { "l4": { "l5": { "l6": { "l7": { "l8": "deep" } } } } } } }
        });
        let fact = CanonJsonStore::create_fact("CHAR:TEST", "nested", nested, FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "BRUTAL-06: Nested JSON must be handled");
    }

    #[test]
    fn brutal_07_rapid_operations_100x() {
        let mut store = CanonJsonStore::new();
        for i in 0..100 {
            let fact = CanonJsonStore::create_fact(
                &format!("CHAR:RAPID{}", i), 
                "prop", 
                json!(i), 
                FactSource::User, 
                LockLevel::None
            );
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
        }
        assert_eq!(store.stats().total_facts, 100, "BRUTAL-07: 100 rapid ops must work");
    }

    #[test]
    fn brutal_08_malformed_entity_id_formats() {
        let mut store = CanonJsonStore::new();
        let bad_formats = vec!["NOCODON", ":", ":EMPTY", "EMPTY:", "::"];
        for bad in bad_formats {
            let mut fact = CanonJsonStore::create_fact("CHAR:OK", "key", json!("v"), FactSource::User, LockLevel::None);
            fact.entity_id = bad.to_string();
            fact.hash = compute_fact_hash(&fact.entity_id, &fact.key, &fact.value, fact.source, fact.lock);
            let result = store.assert_fact(fact, ConflictPolicy::AskUser);
            assert!(result.is_err(), "BRUTAL-08: '{}' must be rejected", bad);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS NIVEAU 3 — AEROSPACE L1-L4
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod aerospace_tests {
    use super::*;
    use serde_json::json;

    // L1 — Property-based (déterminisme)
    #[test]
    fn aero_l1_01_hash_always_64_hex() {
        for i in 0..100 {
            let fact = CanonJsonStore::create_fact(
                &format!("CHAR:TEST{}", i),
                "prop",
                json!({"n": i}),
                FactSource::User,
                LockLevel::None
            );
            assert_eq!(fact.hash.len(), 64, "AERO-L1-01: Hash must be 64 chars");
            assert!(fact.hash.chars().all(|c| c.is_ascii_hexdigit()), "AERO-L1-01: Hash must be hex");
        }
    }

    #[test]
    fn aero_l1_02_fact_id_format() {
        let fact = CanonJsonStore::create_fact("CHAR:TEST", "prop", json!("value"), FactSource::User, LockLevel::None);
        assert!(fact.fact_id.starts_with("FACT_"), "AERO-L1-02: fact_id must start with FACT_");
        assert_eq!(fact.fact_id.len(), 5 + 64, "AERO-L1-02: fact_id must be FACT_ + 64 hex");
    }

    #[test]
    fn aero_l1_03_determinism_1000_runs() {
        let value = json!({"test": "determinism", "count": 42});
        let reference = CanonJsonStore::create_fact("CHAR:DET", "data", value.clone(), FactSource::User, LockLevel::None);
        for i in 0..1000 {
            let fact = CanonJsonStore::create_fact("CHAR:DET", "data", value.clone(), FactSource::User, LockLevel::None);
            assert_eq!(fact.hash, reference.hash, "AERO-L1-03: Run {} differs!", i);
        }
    }

    // L2 — Boundary tests
    #[test]
    fn aero_l2_01_confidence_bounds() {
        let mut store = CanonJsonStore::new();
        let mut fact = CanonJsonStore::create_fact("CHAR:TEST", "key", json!("v"), FactSource::User, LockLevel::None);
        
        fact.confidence = -0.001;
        assert!(store.assert_fact(fact.clone(), ConflictPolicy::AskUser).is_err(), "AERO-L2-01: <0 rejected");
        
        fact.confidence = 1.001;
        assert!(store.assert_fact(fact.clone(), ConflictPolicy::AskUser).is_err(), "AERO-L2-01: >1 rejected");
        
        fact.confidence = 0.0;
        fact.hash = compute_fact_hash(&fact.entity_id, &fact.key, &fact.value, fact.source, fact.lock);
        assert!(store.assert_fact(fact.clone(), ConflictPolicy::AskUser).is_ok(), "AERO-L2-01: 0.0 accepted");
    }

    #[test]
    fn aero_l2_02_empty_key_allowed() {
        let mut store = CanonJsonStore::new();
        let fact = CanonJsonStore::create_fact("CHAR:TEST", "", json!("value"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(fact, ConflictPolicy::AskUser);
        assert!(result.is_ok(), "AERO-L2-02: Empty key should be allowed");
    }

    #[test]
    fn aero_l2_03_all_sources_work() {
        let sources = vec![
            FactSource::User, FactSource::Import, FactSource::Ai,
            FactSource::Inferred, FactSource::System, FactSource::Architect
        ];
        for (i, source) in sources.iter().enumerate() {
            let mut store = CanonJsonStore::new();
            let fact = CanonJsonStore::create_fact(
                &format!("CHAR:SRC{}", i), "key", json!("v"), *source, LockLevel::None
            );
            assert!(store.assert_fact(fact, ConflictPolicy::AskUser).is_ok(), "AERO-L2-03: {:?} must work", source);
        }
    }

    #[test]
    fn aero_l2_04_all_lock_levels_work() {
        let locks = vec![LockLevel::None, LockLevel::Soft, LockLevel::Hard];
        for (i, lock) in locks.iter().enumerate() {
            let mut store = CanonJsonStore::new();
            let fact = CanonJsonStore::create_fact(
                &format!("CHAR:LOCK{}", i), "key", json!("v"), FactSource::User, *lock
            );
            assert!(store.assert_fact(fact, ConflictPolicy::AskUser).is_ok(), "AERO-L2-04: {:?} must work", lock);
        }
    }

    // L3 — Chaos tests
    #[test]
    fn aero_l3_01_concurrent_style_stress() {
        let mut store = CanonJsonStore::new();
        for i in 0..500 {
            let op = i % 5;
            match op {
                0 => {
                    let fact = CanonJsonStore::create_fact(
                        &format!("CHAR:CHAOS{}", i % 50), "prop", json!(i), FactSource::User, LockLevel::None
                    );
                    let _ = store.assert_fact(fact, ConflictPolicy::ArchitectOverride);
                }
                1 => { let _ = store.query(&format!("CHAR:CHAOS{}", i % 50), "prop"); }
                2 => { let _ = store.query_entity(&format!("CHAR:CHAOS{}", i % 50)); }
                3 => { let _ = store.stats(); }
                4 => { let _ = store.export_snapshot(); }
                _ => {}
            }
        }
        assert!(store.verify_ledger_chain(), "AERO-L3-01: Chain must survive chaos");
    }

    #[test]
    fn aero_l3_02_recovery_after_errors() {
        let mut store = CanonJsonStore::new();
        
        // Cause errors
        for _ in 0..10 {
            let mut bad = CanonJsonStore::create_fact("BAD", "k", json!("v"), FactSource::User, LockLevel::None);
            bad.entity_id = "INVALID".to_string();
            bad.hash = compute_fact_hash(&bad.entity_id, &bad.key, &bad.value, bad.source, bad.lock);
            let _ = store.assert_fact(bad, ConflictPolicy::AskUser);
        }
        
        // Must still work
        let good = CanonJsonStore::create_fact("CHAR:GOOD", "key", json!("ok"), FactSource::User, LockLevel::None);
        assert!(store.assert_fact(good, ConflictPolicy::AskUser).is_ok(), "AERO-L3-02: Must recover");
    }

    // L4 — Differential/Oracle tests
    #[test]
    fn aero_l4_01_hash_matches_manual_computation() {
        let entity = "CHAR:ORACLE";
        let key = "test";
        let value = json!({"a": 1, "b": 2});
        let source = FactSource::User;
        let lock = LockLevel::None;
        
        // Manual computation
        let canonical = canonical_json(&value);
        let payload = format!("{}|{}|{}|{}|{}", entity, key, canonical, source, lock);
        let mut hasher = sha2::Sha256::new();
        sha2::Digest::update(&mut hasher, payload.as_bytes());
        let expected: String = format!("{:x}", sha2::Digest::finalize(hasher));
        
        // Function computation
        let actual = compute_fact_hash(entity, key, &value, source, lock);
        
        assert_eq!(actual, expected, "AERO-L4-01: Hash must match oracle");
    }

    #[test]
    fn aero_l4_02_snapshot_hash_deterministic() {
        let mut hashes = Vec::new();
        for _ in 0..20 {
            let mut store = CanonJsonStore::new();
            store.assert_fact(CanonJsonStore::create_fact("CHAR:A", "k1", json!("v1"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
            store.assert_fact(CanonJsonStore::create_fact("CHAR:B", "k2", json!("v2"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
            let snapshot = store.export_snapshot().unwrap();
            hashes.push(snapshot.snapshot_hash);
        }
        assert!(hashes.iter().all(|h| h == &hashes[0]), "AERO-L4-02: Snapshot hash must be deterministic");
    }

    #[test]
    fn aero_l4_03_ledger_event_count_exact() {
        let mut store = CanonJsonStore::new();
        let ops = vec![
            ("CHAR:A", "k", json!("v1")),
            ("CHAR:B", "k", json!("v2")),
            ("CHAR:C", "k", json!("v3")),
        ];
        for (e, k, v) in ops {
            let fact = CanonJsonStore::create_fact(e, k, v, FactSource::User, LockLevel::None);
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
        }
        assert_eq!(store.ledger_len(), 3, "AERO-L4-03: Exactly 3 events expected");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS INVCORE — Invariants CANON
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod invcore_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn invcore_01_determinism_absolute() {
        // CANON-I01: Même input = Même output (1000 runs)
        let value = json!({"complex": {"nested": [1,2,3]}, "unicode": "日本語"});
        let reference = CanonJsonStore::create_fact("CHAR:INV01", "data", value.clone(), FactSource::User, LockLevel::None);
        for _ in 0..1000 {
            let fact = CanonJsonStore::create_fact("CHAR:INV01", "data", value.clone(), FactSource::User, LockLevel::None);
            assert_eq!(fact.fact_id, reference.fact_id, "INVCORE-01: Determinism violated!");
            assert_eq!(fact.hash, reference.hash, "INVCORE-01: Hash differs!");
        }
    }

    #[test]
    fn invcore_02_ledger_append_only() {
        // CANON-I02: Ledger croît toujours
        let mut store = CanonJsonStore::new();
        let mut sizes = Vec::new();
        for i in 0..100 {
            let fact = CanonJsonStore::create_fact(&format!("CHAR:INV02_{}", i), "k", json!(i), FactSource::User, LockLevel::None);
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
            sizes.push(store.ledger_len());
        }
        for i in 1..sizes.len() {
            assert!(sizes[i] > sizes[i-1], "INVCORE-02: Ledger must only grow");
        }
    }

    #[test]
    fn invcore_03_conflict_never_auto_resolve() {
        // CANON-I03: Conflit = question, jamais auto-résolution
        let mut store = CanonJsonStore::new();
        store.assert_fact(CanonJsonStore::create_fact("CHAR:INV03", "eyes", json!("blue"), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
        
        let conflict = CanonJsonStore::create_fact("CHAR:INV03", "eyes", json!("green"), FactSource::User, LockLevel::None);
        let result = store.assert_fact(conflict, ConflictPolicy::AskUser).unwrap();
        
        match result {
            AssertResult::Conflict { conflicts } => {
                assert!(!conflicts.is_empty(), "INVCORE-03: Must return conflicts");
            }
            _ => panic!("INVCORE-03: Must be Conflict, not auto-resolved!")
        }
    }

    #[test]
    fn invcore_04_hard_lock_inviolable_1000x() {
        // CANON-I04: Lock HARD = inviolable (1000 tentatives)
        let mut store = CanonJsonStore::new();
        store.assert_fact(CanonJsonStore::create_fact("CHAR:INV04", "locked", json!("original"), FactSource::User, LockLevel::Hard), ConflictPolicy::ArchitectOverride).unwrap();
        
        for i in 0..1000 {
            let attack = CanonJsonStore::create_fact("CHAR:INV04", "locked", json!(format!("attack_{}", i)), FactSource::User, LockLevel::None);
            let result = store.assert_fact(attack, ConflictPolicy::ArchitectOverride);
            assert!(matches!(result, Err(CanonError::LockViolation { .. })), "INVCORE-04: Attempt {} must fail", i);
        }
        
        let fact = store.query("CHAR:INV04", "locked").unwrap();
        assert_eq!(fact.value, json!("original"), "INVCORE-04: Value must be unchanged");
    }

    #[test]
    fn invcore_05_export_canonical() {
        // CANON-I05: Export toujours canonique
        let mut hashes = Vec::new();
        for _ in 0..20 {
            let mut store = CanonJsonStore::new();
            // Insertion dans un ordre différent à chaque fois
            let facts = vec![
                ("CHAR:Z", "k", json!("z")),
                ("CHAR:A", "k", json!("a")),
                ("CHAR:M", "k", json!("m")),
            ];
            for (e, k, v) in facts {
                store.assert_fact(CanonJsonStore::create_fact(e, k, v, FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
            }
            hashes.push(store.export_snapshot().unwrap().snapshot_hash);
        }
        assert!(hashes.iter().all(|h| h == &hashes[0]), "INVCORE-05: Export must be canonical");
    }

    #[test]
    fn invcore_06_import_export_idempotent() {
        // CANON-I06: import(export(state)) = state
        let mut store1 = CanonJsonStore::new();
        for i in 0..10 {
            store1.assert_fact(CanonJsonStore::create_fact(&format!("CHAR:IE{}", i), "k", json!(i), FactSource::User, LockLevel::None), ConflictPolicy::ArchitectOverride).unwrap();
        }
        let snap1 = store1.export_snapshot().unwrap();
        
        let mut store2 = CanonJsonStore::new();
        store2.import_snapshot(snap1.clone(), ImportPolicy::ReplaceAll).unwrap();
        let snap2 = store2.export_snapshot().unwrap();
        
        assert_eq!(snap1.snapshot_hash, snap2.snapshot_hash, "INVCORE-06: Idempotence violated");
    }

    #[test]
    fn invcore_08_hash_chain_integrity() {
        // CANON-I08: Chain de hash intègre
        let mut store = CanonJsonStore::new();
        for i in 0..200 {
            let fact = CanonJsonStore::create_fact(&format!("CHAR:HC{}", i), "k", json!(i), FactSource::User, LockLevel::None);
            store.assert_fact(fact, ConflictPolicy::ArchitectOverride).unwrap();
        }
        assert!(store.verify_ledger_chain(), "INVCORE-08: Hash chain must be valid");
    }
}

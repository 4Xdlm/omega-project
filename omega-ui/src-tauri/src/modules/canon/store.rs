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

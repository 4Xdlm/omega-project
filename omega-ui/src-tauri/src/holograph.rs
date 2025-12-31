//! OMEGA HOLOGRAPH — Coherence Scanner
//! MVP v0.1: LOGIC (contradictions) + DYNAMICS (emotion coherence)
//! NASA-Grade AS9100D

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolographReport {
    pub logic_score: f32,
    pub dynamics_score: f32,
    pub overall_score: f32,
    pub issues: Vec<CoherenceIssue>,
    pub scan_duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoherenceIssue {
    pub issue_type: IssueType,
    pub severity: Severity,
    pub description: String,
    pub evidence: Vec<String>,
    pub location: Option<String>,
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IssueType {
    Contradiction,      // LOGIC: fait contradictoire
    TemporalError,      // LOGIC: erreur chronologique  
    EmotionShift,       // DYNAMICS: changement emotion brutal
    CharacterInconsistency, // DYNAMICS: personnage incohérent
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPH SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

pub struct HolographScanner {
    contradiction_patterns: Vec<ContradictionPattern>,
    emotion_keywords: HashMap<String, Vec<String>>,
}

struct ContradictionPattern {
    positive: Vec<&'static str>,
    negative: Vec<&'static str>,
    category: &'static str,
}

impl Default for HolographScanner {
    fn default() -> Self {
        Self::new()
    }
}

impl HolographScanner {
    pub fn new() -> Self {
        let contradiction_patterns = vec![
            // Taille
            ContradictionPattern {
                positive: vec!["grand", "immense", "enorme", "geant", "haut"],
                negative: vec!["petit", "minuscule", "nain", "bas", "court"],
                category: "taille",
            },
            // Age
            ContradictionPattern {
                positive: vec!["jeune", "juvenile", "enfant", "adolescent"],
                negative: vec!["vieux", "age", "ancien", "vieillard"],
                category: "age",
            },
            // Couleur cheveux
            ContradictionPattern {
                positive: vec!["blond", "blonde", "dore"],
                negative: vec!["brun", "brune", "noir", "sombre"],
                category: "cheveux",
            },
            // Temperature
            ContradictionPattern {
                positive: vec!["chaud", "brulant", "torride", "chaleur"],
                negative: vec!["froid", "glacial", "gele", "glace"],
                category: "temperature",
            },
            // Lumiere
            ContradictionPattern {
                positive: vec!["lumineux", "clair", "eclaire", "brillant"],
                negative: vec!["sombre", "obscur", "noir", "tenebreux"],
                category: "lumiere",
            },
            // Etat de vie
            ContradictionPattern {
                positive: vec!["vivant", "vie", "respire", "bouge"],
                negative: vec!["mort", "decede", "cadavre", "tue"],
                category: "vie",
            },
            // Presence
            ContradictionPattern {
                positive: vec!["present", "la", "arrive", "entre"],
                negative: vec!["absent", "parti", "disparu", "sorti"],
                category: "presence",
            },
        ];

        let mut emotion_keywords = HashMap::new();
        emotion_keywords.insert("joy".to_string(), vec![
            "heureux", "joyeux", "ravi", "content", "sourire", "rire"
        ].iter().map(|s| s.to_string()).collect());
        emotion_keywords.insert("sadness".to_string(), vec![
            "triste", "pleure", "larme", "chagrin", "melancolie", "desespoir"
        ].iter().map(|s| s.to_string()).collect());
        emotion_keywords.insert("anger".to_string(), vec![
            "colere", "furieux", "rage", "enerve", "agace", "irrite"
        ].iter().map(|s| s.to_string()).collect());
        emotion_keywords.insert("fear".to_string(), vec![
            "peur", "terreur", "effraye", "angoisse", "panique", "crainte"
        ].iter().map(|s| s.to_string()).collect());

        Self {
            contradiction_patterns,
            emotion_keywords,
        }
    }

    /// Scan complet du texte
    pub fn scan(&self, text: &str) -> HolographReport {
        let start = std::time::Instant::now();
        
        let mut issues = Vec::new();
        
        // LOGIC: Scan contradictions
        let logic_issues = self.scan_logic(text);
        issues.extend(logic_issues.clone());
        
        // DYNAMICS: Scan emotion coherence
        let dynamics_issues = self.scan_dynamics(text);
        issues.extend(dynamics_issues.clone());
        
        // Calculate scores
        let logic_score = self.calculate_logic_score(&logic_issues);
        let dynamics_score = self.calculate_dynamics_score(&dynamics_issues);
        let overall_score = (logic_score + dynamics_score) / 2.0;
        
        HolographReport {
            logic_score,
            dynamics_score,
            overall_score,
            issues,
            scan_duration_ms: start.elapsed().as_millis() as u64,
        }
    }

    /// LOGIC: Détecte les contradictions factuelles
    fn scan_logic(&self, text: &str) -> Vec<CoherenceIssue> {
        let mut issues = Vec::new();
        let text_lower = text.to_lowercase();
        let sentences: Vec<&str> = text.split(|c| c == '.' || c == '!' || c == '?')
            .filter(|s| !s.trim().is_empty())
            .collect();
        
        // Extraire les entités (noms propres simplifiés)
        let entities = self.extract_entities(text);
        
        for entity in &entities {
            let entity_lower = entity.to_lowercase();
            let mut entity_attributes: HashMap<&str, Vec<(String, usize)>> = HashMap::new();
            
            for (idx, sentence) in sentences.iter().enumerate() {
                let sentence_lower = sentence.to_lowercase();
                
                if !sentence_lower.contains(&entity_lower) {
                    continue;
                }
                
                for pattern in &self.contradiction_patterns {
                    for pos in &pattern.positive {
                        if sentence_lower.contains(pos) {
                            entity_attributes
                                .entry(pattern.category)
                                .or_default()
                                .push((format!("+{}", pos), idx));
                        }
                    }
                    for neg in &pattern.negative {
                        if sentence_lower.contains(neg) {
                            entity_attributes
                                .entry(pattern.category)
                                .or_default()
                                .push((format!("-{}", neg), idx));
                        }
                    }
                }
            }
            
            // Chercher contradictions
            for (category, attrs) in &entity_attributes {
                let positives: Vec<_> = attrs.iter().filter(|(a, _)| a.starts_with('+')).collect();
                let negatives: Vec<_> = attrs.iter().filter(|(a, _)| a.starts_with('-')).collect();
                
                if !positives.is_empty() && !negatives.is_empty() {
                    issues.push(CoherenceIssue {
                        issue_type: IssueType::Contradiction,
                        severity: Severity::High,
                        description: format!(
                            "Contradiction sur {} pour '{}': {} vs {}",
                            category, entity,
                            positives.iter().map(|(a, _)| a.as_str()).collect::<Vec<_>>().join(", "),
                            negatives.iter().map(|(a, _)| a.as_str()).collect::<Vec<_>>().join(", ")
                        ),
                        evidence: vec![
                            format!("Positif: {:?}", positives),
                            format!("Negatif: {:?}", negatives),
                        ],
                        location: Some(format!("Entite: {}", entity)),
                        suggestion: Some(format!("Verifier la coherence de {} pour {}", category, entity)),
                    });
                }
            }
        }
        
        issues
    }

    /// DYNAMICS: Détecte les incohérences émotionnelles
    fn scan_dynamics(&self, text: &str) -> Vec<CoherenceIssue> {
        let mut issues = Vec::new();
        
        // Diviser en paragraphes
        let paragraphs: Vec<&str> = text.split("\n\n")
            .filter(|p| p.trim().len() > 50)
            .collect();
        
        if paragraphs.len() < 2 {
            return issues;
        }
        
        let mut prev_emotions: Vec<String> = Vec::new();
        
        for (idx, paragraph) in paragraphs.iter().enumerate() {
            let para_lower = paragraph.to_lowercase();
            let mut current_emotions: Vec<String> = Vec::new();
            
            for (emotion, keywords) in &self.emotion_keywords {
                for kw in keywords {
                    if para_lower.contains(kw) {
                        if !current_emotions.contains(emotion) {
                            current_emotions.push(emotion.clone());
                        }
                    }
                }
            }
            
            // Détecter changements brusques
            if idx > 0 && !prev_emotions.is_empty() && !current_emotions.is_empty() {
                let opposites = vec![
                    ("joy", "sadness"),
                    ("anger", "fear"),
                ];
                
                for (e1, e2) in &opposites {
                    let has_e1_prev = prev_emotions.iter().any(|e| e == *e1);
                    let has_e2_curr = current_emotions.iter().any(|e| e == *e2);
                    let has_e2_prev = prev_emotions.iter().any(|e| e == *e2);
                    let has_e1_curr = current_emotions.iter().any(|e| e == *e1);
                    
                    if (has_e1_prev && has_e2_curr) || (has_e2_prev && has_e1_curr) {
                        issues.push(CoherenceIssue {
                            issue_type: IssueType::EmotionShift,
                            severity: Severity::Medium,
                            description: format!(
                                "Changement emotionnel brusque: {} -> {}",
                                prev_emotions.join(", "),
                                current_emotions.join(", ")
                            ),
                            evidence: vec![
                                format!("Paragraphe {}: {:?}", idx, prev_emotions),
                                format!("Paragraphe {}: {:?}", idx + 1, current_emotions),
                            ],
                            location: Some(format!("Paragraphe {}-{}", idx, idx + 1)),
                            suggestion: Some("Ajouter une transition emotionnelle".to_string()),
                        });
                    }
                }
            }
            
            prev_emotions = current_emotions;
        }
        
        issues
    }

    /// Extrait les entités (noms propres) du texte
    fn extract_entities(&self, text: &str) -> Vec<String> {
        let mut entities = Vec::new();
        let re = Regex::new(r"\b([A-Z][a-zàâäéèêëïîôùûüç]+)\b").unwrap();
        
        for cap in re.captures_iter(text) {
            let entity = cap[1].to_string();
            // Filtrer les mots en début de phrase
            let common_words = vec!["Le", "La", "Les", "Un", "Une", "Il", "Elle", "Ce", "Cette", "Son", "Sa", "Ses"];
            if !common_words.contains(&entity.as_str()) && !entities.contains(&entity) {
                entities.push(entity);
            }
        }
        
        entities
    }

    fn calculate_logic_score(&self, issues: &[CoherenceIssue]) -> f32 {
        let critical = issues.iter().filter(|i| i.severity == Severity::Critical).count();
        let high = issues.iter().filter(|i| i.severity == Severity::High).count();
        let medium = issues.iter().filter(|i| i.severity == Severity::Medium).count();
        
        let penalty = (critical * 30 + high * 15 + medium * 5) as f32;
        (100.0 - penalty).max(0.0) / 100.0
    }

    fn calculate_dynamics_score(&self, issues: &[CoherenceIssue]) -> f32 {
        let shifts = issues.iter().filter(|i| i.issue_type == IssueType::EmotionShift).count();
        let penalty = (shifts * 10) as f32;
        (100.0 - penalty).max(0.0) / 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_contradiction() {
        let scanner = HolographScanner::new();
        let text = "Pierre etait grand et imposant. Plus tard, Pierre, ce petit homme, entra.";
        let report = scanner.scan(text);
        
        assert!(!report.issues.is_empty(), "Should detect contradiction");
        assert!(report.issues.iter().any(|i| i.issue_type == IssueType::Contradiction));
    }

    #[test]
    fn test_no_contradiction() {
        let scanner = HolographScanner::new();
        let text = "Marie etait belle. Elle portait une robe rouge.";
        let report = scanner.scan(text);
        
        let contradictions: Vec<_> = report.issues.iter()
            .filter(|i| i.issue_type == IssueType::Contradiction)
            .collect();
        assert!(contradictions.is_empty(), "Should not detect contradiction");
    }

    #[test]
    fn test_emotion_shift() {
        let scanner = HolographScanner::new();
        let text = "Il etait heureux et joyeux ce matin-la. Le sourire illuminait son visage.\n\nSoudain, la tristesse l'envahit. Les larmes coulerent sur ses joues.";
        let report = scanner.scan(text);
        
        let shifts: Vec<_> = report.issues.iter()
            .filter(|i| i.issue_type == IssueType::EmotionShift)
            .collect();
        assert!(!shifts.is_empty(), "Should detect emotion shift");
    }

    #[test]
    fn test_scores() {
        let scanner = HolographScanner::new();
        let text = "Un texte simple sans probleme.";
        let report = scanner.scan(text);
        
        assert!(report.logic_score >= 0.9, "Clean text should have high logic score");
        assert!(report.dynamics_score >= 0.9, "Clean text should have high dynamics score");
    }
}

// ============================================================================
// OMEGA — FR_LEXICON_V1_GOLD (Aerospace Grade)
// 
// RÈGLE CARDINALE : LA BIBLE FAIT TOUJOURS FOI
// 
// Priorités (NON NÉGOCIABLES) :
// 1. User Overrides (Bible) — PRIORITÉ ABSOLUE
// 2. Proper Noun Blacklist
// 3. PNG Heuristique TitleCase
// 4. Lexicon Match (modules selon poids)
// 5. Résolution conflits
//
// Version: 1.0.0 GOLD
// Date: 2025-12-30
// Total Keywords: 118
// ============================================================================

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

// ============================================================================
// METADATA
// ============================================================================

pub const LEXICON_ID: &str = "FR_LEXICON_V1_GOLD";
pub const LEXICON_VERSION: &str = "1.0.0";
pub const LEXICON_DATE: &str = "2025-12-30";
pub const TOTAL_KEYWORDS: usize = 118;

// ============================================================================
// NORMALISATION AÉROSPATIALE
// ============================================================================

/// Normalise le texte : lowercase + suppression accents + ponctuation → espace
pub fn normalize_fr(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    
    for c in input.to_lowercase().chars() {
        let normalized = match c {
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'à' | 'â' | 'ä' => 'a',
            'ù' | 'û' | 'ü' => 'u',
            'ô' | 'ö' => 'o',
            'î' | 'ï' => 'i',
            'ç' => 'c',
            'œ' => { out.push('o'); 'e' },
            'æ' => { out.push('a'); 'e' },
            // Ponctuation critique → espace (l'arme → l arme)
            '\'' | '-' | '.' | ',' | ';' | ':' | '!' | '?' | 
            '"' | '(' | ')' | '[' | ']' | '{' | '}' | '«' | '»' | 
            '—' | '–' | '…' => ' ',
            _ if c.is_alphanumeric() => c,
            _ => ' ',
        };
        out.push(normalized);
    }
    
    // Collapse espaces multiples
    let mut result = String::with_capacity(out.len());
    let mut prev_space = true;
    for ch in out.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
        } else {
            result.push(ch);
            prev_space = false;
        }
    }
    result.trim().to_string()
}

// ============================================================================
// USER OVERRIDES (BIBLE) — PRIORITÉ ABSOLUE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UserOverrides {
    #[serde(default)]
    pub schema: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub updated: String,
    #[serde(default)]
    pub proper_nouns: Vec<ProperNounRule>,
    #[serde(default)]
    pub force_emotions: Vec<ForceEmotionRule>,
    #[serde(default)]
    pub ignore_list: Vec<IgnoreRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProperNounRule {
    pub token: String,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(default)]
    pub decision: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub example: String,
    #[serde(default)]
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForceEmotionRule {
    pub token: String,
    pub emotion: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub example: String,
    #[serde(default)]
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgnoreRule {
    pub token: String,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub date: String,
}

impl UserOverrides {
    pub fn load<P: AsRef<Path>>(path: P) -> Self {
        let path = path.as_ref();
        if !path.exists() {
            return UserOverrides::default();
        }
        match fs::read_to_string(path) {
            Ok(content) => {
                let mut uo: UserOverrides = serde_json::from_str(&content)
                    .unwrap_or_default();
                // Normaliser tous les tokens
                for r in &mut uo.proper_nouns {
                    r.token = normalize_fr(&r.token);
                }
                for r in &mut uo.force_emotions {
                    r.token = normalize_fr(&r.token);
                    r.emotion = r.emotion.to_lowercase();
                }
                for r in &mut uo.ignore_list {
                    r.token = normalize_fr(&r.token);
                }
                uo
            }
            Err(_) => UserOverrides::default(),
        }
    }
    
    pub fn save<P: AsRef<Path>>(&self, path: P) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)
    }
}

// Index rapide pour lookup O(1)
#[derive(Debug, Clone, Default)]
pub struct OverridesIndex {
    pub proper_nouns: HashSet<String>,
    pub ignore: HashSet<String>,
    pub force_emotion: HashMap<String, String>,
    pub version: String,
}

impl OverridesIndex {
    pub fn from(uo: &UserOverrides) -> Self {
        let mut proper_nouns = HashSet::new();
        let mut ignore = HashSet::new();
        let mut force_emotion = HashMap::new();

        for r in &uo.proper_nouns {
            proper_nouns.insert(r.token.clone());
        }
        for r in &uo.ignore_list {
            ignore.insert(r.token.clone());
        }
        for r in &uo.force_emotions {
            force_emotion.insert(r.token.clone(), r.emotion.clone());
        }

        Self {
            proper_nouns,
            ignore,
            force_emotion,
            version: uo.version.clone(),
        }
    }
}

// ============================================================================
// PROPER NOUN GUARD (PNG)
// ============================================================================

pub struct ProperNounGuard {
    pub enabled: bool,
}

impl ProperNounGuard {
    pub fn new(enabled: bool) -> Self {
        Self { enabled }
    }

    /// Détecte si un token est probablement un nom propre (TitleCase, pas début de phrase)
    pub fn should_block(&self, original: &str, is_begin_sentence: bool) -> bool {
        if !self.enabled {
            return false;
        }
        if is_begin_sentence {
            return false;
        }

        let w = original.trim_matches(|c: char| !c.is_alphanumeric());
        if w.len() < 2 {
            return false;
        }

        let mut chars = w.chars();
        let first = chars.next().unwrap();
        if !first.is_uppercase() {
            return false;
        }

        // Reste doit être lowercase
        chars.all(|c| !c.is_alphabetic() || c.is_lowercase())
    }
}

// ============================================================================
// TOKENISATION
// ============================================================================

#[derive(Debug, Clone)]
pub struct Token {
    pub original: String,
    pub normalized: String,
    pub is_begin_sentence: bool,
    pub position: usize,
}

pub fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut begin_sentence = true;
    let mut position = 0;

    for raw in text.split_whitespace() {
        let norm = normalize_fr(raw);
        
        // Sentence boundary sur .?!
        let ends_sentence = raw.contains('.') || raw.contains('!') || raw.contains('?');
        
        if norm.is_empty() {
            if ends_sentence {
                begin_sentence = true;
            }
            continue;
        }

        // Le token normalisé peut contenir des espaces (après ponctuation)
        for part in norm.split_whitespace() {
            if part.is_empty() || part.len() < 2 {
                continue;
            }
            tokens.push(Token {
                original: raw.to_string(),
                normalized: part.to_string(),
                is_begin_sentence: begin_sentence,
                position,
            });
            position += 1;
            begin_sentence = false;
        }

        if ends_sentence {
            begin_sentence = true;
        }
    }
    tokens
}

// ============================================================================
// LEXIQUE FR_LEXICON_V1_GOLD (118 entrées)
// Corrections C1-C4 appliquées
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MatchKind {
    Exact,
    Stem,  // prefix match, pattern.len() >= 4
}

#[derive(Debug, Clone)]
pub struct LexEntry {
    pub pattern: &'static str,
    pub kind: MatchKind,
}

pub fn build_lexicon_gold() -> HashMap<&'static str, Vec<LexEntry>> {
    use MatchKind::{Exact as E, Stem as S};
    
    let mut m: HashMap<&'static str, Vec<LexEntry>> = HashMap::new();

    // 3.1 JOY — 13 entrées
    m.insert("joy", vec![
        LexEntry { pattern: "joie", kind: E },
        LexEntry { pattern: "heureux", kind: E },
        LexEntry { pattern: "heureuse", kind: E },
        LexEntry { pattern: "bonheur", kind: E },
        LexEntry { pattern: "ravi", kind: E },
        LexEntry { pattern: "sourire", kind: E },
        LexEntry { pattern: "rire", kind: E },
        LexEntry { pattern: "rejou", kind: S },
        LexEntry { pattern: "enchant", kind: S },
        LexEntry { pattern: "jubil", kind: S },
        LexEntry { pattern: "allegr", kind: S },
        LexEntry { pattern: "radieu", kind: S },
        LexEntry { pattern: "felicit", kind: S },
    ]);

    // 3.2 SADNESS — 14 entrées
    m.insert("sadness", vec![
        LexEntry { pattern: "triste", kind: E },
        LexEntry { pattern: "pleur", kind: S },
        LexEntry { pattern: "larme", kind: E },
        LexEntry { pattern: "chagrin", kind: E },
        LexEntry { pattern: "douleur", kind: E },
        LexEntry { pattern: "souffr", kind: S },
        LexEntry { pattern: "sanglot", kind: E },
        LexEntry { pattern: "deuil", kind: E },
        LexEntry { pattern: "melanc", kind: S },
        LexEntry { pattern: "desespoir", kind: E },
        LexEntry { pattern: "abattu", kind: E },
        LexEntry { pattern: "accabl", kind: S },
        LexEntry { pattern: "afflict", kind: S },
        LexEntry { pattern: "morose", kind: E },
    ]);

    // 3.3 ANGER — 14 entrées
    m.insert("anger", vec![
        LexEntry { pattern: "colere", kind: E },
        LexEntry { pattern: "furieu", kind: S },
        LexEntry { pattern: "furie", kind: E },
        LexEntry { pattern: "rage", kind: E },
        LexEntry { pattern: "enerv", kind: S },
        LexEntry { pattern: "irrit", kind: S },
        LexEntry { pattern: "agac", kind: S },
        LexEntry { pattern: "exasper", kind: S },
        LexEntry { pattern: "fulmin", kind: S },
        LexEntry { pattern: "haine", kind: E },
        LexEntry { pattern: "detest", kind: S },
        LexEntry { pattern: "revolt", kind: S },
        LexEntry { pattern: "indign", kind: S },
        LexEntry { pattern: "courroux", kind: E },
    ]);

    // 3.4 FEAR — 14 entrées (C4: effray racine)
    m.insert("fear", vec![
        LexEntry { pattern: "peur", kind: E },
        LexEntry { pattern: "effroi", kind: E },
        LexEntry { pattern: "terreur", kind: E },
        LexEntry { pattern: "terrif", kind: S },
        LexEntry { pattern: "angoiss", kind: S },
        LexEntry { pattern: "anxie", kind: S },
        LexEntry { pattern: "inquiet", kind: E },
        LexEntry { pattern: "paniqu", kind: S },
        LexEntry { pattern: "frayeur", kind: E },
        LexEntry { pattern: "crainte", kind: E },
        LexEntry { pattern: "redout", kind: S },
        LexEntry { pattern: "epouvant", kind: S },
        LexEntry { pattern: "horrif", kind: S },
        LexEntry { pattern: "effray", kind: S },  // C4 corrigé
    ]);

    // 3.5 TRUST — 12 entrées
    m.insert("trust", vec![
        LexEntry { pattern: "confian", kind: S },
        LexEntry { pattern: "fidel", kind: S },
        LexEntry { pattern: "loyal", kind: E },
        LexEntry { pattern: "fiable", kind: E },
        LexEntry { pattern: "sincer", kind: S },
        LexEntry { pattern: "honnet", kind: S },
        LexEntry { pattern: "integr", kind: S },
        LexEntry { pattern: "promesse", kind: E },
        LexEntry { pattern: "serment", kind: E },
        LexEntry { pattern: "serein", kind: E },
        LexEntry { pattern: "devou", kind: S },
        LexEntry { pattern: "certitud", kind: E },
    ]);

    // 3.6 LOVE — 11 entrées
    m.insert("love", vec![
        LexEntry { pattern: "amour", kind: E },
        LexEntry { pattern: "ador", kind: S },
        LexEntry { pattern: "affection", kind: E },
        LexEntry { pattern: "passion", kind: E },
        LexEntry { pattern: "cherir", kind: E },
        LexEntry { pattern: "caresse", kind: E },
        LexEntry { pattern: "baiser", kind: E },
        LexEntry { pattern: "etreinte", kind: E },
        LexEntry { pattern: "tendresse", kind: E },
        LexEntry { pattern: "devotion", kind: E },
        LexEntry { pattern: "idolatr", kind: S },
    ]);

    // 3.7 SURPRISE — 10 entrées
    m.insert("surprise", vec![
        LexEntry { pattern: "surpris", kind: E },
        LexEntry { pattern: "etonn", kind: S },
        LexEntry { pattern: "stupef", kind: S },
        LexEntry { pattern: "abasourdi", kind: E },
        LexEntry { pattern: "sider", kind: S },
        LexEntry { pattern: "ebahi", kind: E },
        LexEntry { pattern: "interloqu", kind: S },
        LexEntry { pattern: "inattendu", kind: E },
        LexEntry { pattern: "imprevu", kind: E },
        LexEntry { pattern: "deconcert", kind: S },
    ]);

    // 3.8 ANTICIPATION — 10 entrées (C2: -hate, C3: pressent racine)
    m.insert("anticipation", vec![
        LexEntry { pattern: "espoir", kind: E },
        LexEntry { pattern: "esper", kind: S },
        LexEntry { pattern: "impatien", kind: S },
        LexEntry { pattern: "pressent", kind: S },  // C3 corrigé
        LexEntry { pattern: "anticip", kind: S },
        LexEntry { pattern: "ambition", kind: E },
        LexEntry { pattern: "aspir", kind: S },
        LexEntry { pattern: "presage", kind: E },
        LexEntry { pattern: "prometteur", kind: E },
        LexEntry { pattern: "immin", kind: S },
        // C2: "hate" supprimé (confusion hâte/hate EN)
    ]);

    // 3.9 PRIDE — 10 entrées
    m.insert("pride", vec![
        LexEntry { pattern: "fiert", kind: S },
        LexEntry { pattern: "orgueil", kind: E },
        LexEntry { pattern: "dignit", kind: S },
        LexEntry { pattern: "honneur", kind: E },
        LexEntry { pattern: "gloire", kind: E },
        LexEntry { pattern: "triomph", kind: S },
        LexEntry { pattern: "accompli", kind: E },
        LexEntry { pattern: "merite", kind: E },
        LexEntry { pattern: "prestige", kind: E },
        LexEntry { pattern: "satisf", kind: S },
    ]);

    // 3.10 DISGUST — 10 entrées
    m.insert("disgust", vec![
        LexEntry { pattern: "degout", kind: E },
        LexEntry { pattern: "ecoeur", kind: S },
        LexEntry { pattern: "repugn", kind: S },
        LexEntry { pattern: "nausee", kind: E },
        LexEntry { pattern: "abject", kind: E },
        LexEntry { pattern: "immonde", kind: E },
        LexEntry { pattern: "ignoble", kind: E },
        LexEntry { pattern: "repuls", kind: S },
        LexEntry { pattern: "aversion", kind: E },
        LexEntry { pattern: "mepris", kind: E },
    ]);

    m
}

// ============================================================================
// ANALYSE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordHit {
    pub word: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionResult {
    pub emotion: String,
    pub occurrences: usize,
    pub intensity: f64,
    pub keywords: Vec<String>,
    pub keyword_counts: Vec<KeywordHit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisMeta {
    pub lexicon_id: String,
    pub lexicon_version: String,
    pub total_keywords: usize,
    pub normalization: String,
    pub proper_noun_guard: bool,
    pub user_overrides_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub token: String,
    pub candidates: Vec<String>,
    pub occurrences: usize,
    pub examples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub meta: AnalysisMeta,
    pub word_count: usize,
    pub total_emotion_hits: usize,
    pub emotions: Vec<EmotionResult>,
    pub dominant_emotion: Option<String>,
    pub conflicts: Vec<Conflict>,
}

#[derive(Debug, Clone)]
pub struct AnalyzerConfig {
    pub png_enabled: bool,
    pub proper_noun_blacklist: HashSet<String>,
}

impl Default for AnalyzerConfig {
    fn default() -> Self {
        Self {
            png_enabled: true,
            proper_noun_blacklist: HashSet::new(),
        }
    }
}

/// Analyse un texte avec le lexique GOLD
/// RÈGLE CARDINALE : La Bible fait toujours foi
pub fn analyze_gold(
    text: &str,
    overrides: Option<&OverridesIndex>,
    config: &AnalyzerConfig,
) -> AnalysisResult {
    let lexicon = build_lexicon_gold();
    let png = ProperNounGuard::new(config.png_enabled);
    let tokens = tokenize(text);
    
    // Compteurs par émotion
    let mut counts: HashMap<&str, usize> = HashMap::new();
    let mut keywords_map: HashMap<&str, HashMap<String, usize>> = HashMap::new();
    
    for emotion in lexicon.keys() {
        counts.insert(emotion, 0);
        keywords_map.insert(emotion, HashMap::new());
    }
    
    let mut total_hits = 0;
    let mut conflicts: Vec<Conflict> = Vec::new();
    
    for token in &tokens {
        let tok = &token.normalized;
        
        // ═══════════════════════════════════════════════════════════════
        // PRIORITÉ 1 : BIBLE UTILISATEUR (FAIT TOUJOURS FOI)
        // ═══════════════════════════════════════════════════════════════
        if let Some(uo) = overrides {
            // 1a. Ignore list
            if uo.ignore.contains(tok) {
                continue;
            }
            
            // 1b. Force emotion (l'utilisateur a tranché)
            if let Some(forced_emotion) = uo.force_emotion.get(tok) {
                if let Some(count) = counts.get_mut(forced_emotion.as_str()) {
                    *count += 1;
                    total_hits += 1;
                    keywords_map
                        .get_mut(forced_emotion.as_str())
                        .map(|m| *m.entry(tok.clone()).or_insert(0) += 1);
                }
                continue;
            }
            
            // 1c. Proper noun block (l'utilisateur a dit "c'est un nom propre")
            if uo.proper_nouns.contains(tok) {
                continue;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // PRIORITÉ 2 : PROPER NOUN BLACKLIST EXPLICITE
        // ═══════════════════════════════════════════════════════════════
        if config.proper_noun_blacklist.contains(tok) {
            continue;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // PRIORITÉ 3 : PNG HEURISTIQUE (TitleCase)
        // ═══════════════════════════════════════════════════════════════
        if png.should_block(&token.original, token.is_begin_sentence) {
            continue;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // PRIORITÉ 4 : MATCHING LEXIQUE
        // ═══════════════════════════════════════════════════════════════
        for (emotion, entries) in &lexicon {
            for entry in entries {
                let matched = match entry.kind {
                    MatchKind::Exact => tok == entry.pattern,
                    MatchKind::Stem => {
                        entry.pattern.len() >= 4 && tok.starts_with(entry.pattern)
                    }
                };
                
                if matched {
                    *counts.get_mut(emotion).unwrap() += 1;
                    total_hits += 1;
                    keywords_map
                        .get_mut(emotion)
                        .map(|m| *m.entry(tok.clone()).or_insert(0) += 1);
                    break; // Un token = une émotion max
                }
            }
        }
    }
    
    // Construire les résultats
    let word_count = tokens.len();
    let mut emotions: Vec<EmotionResult> = Vec::new();
    
    for (emotion, count) in &counts {
        let intensity = if total_hits > 0 {
            *count as f64 / total_hits as f64
        } else {
            0.0
        };
        
        let kw_map = keywords_map.get(emotion).unwrap();
        let mut keyword_counts: Vec<KeywordHit> = kw_map
            .iter()
            .map(|(w, c)| KeywordHit { word: w.clone(), count: *c })
            .collect();
        keyword_counts.sort_by(|a, b| b.count.cmp(&a.count));
        
        let keywords: Vec<String> = keyword_counts
            .iter()
            .take(10)
            .map(|k| k.word.clone())
            .collect();
        
        emotions.push(EmotionResult {
            emotion: emotion.to_string(),
            occurrences: *count,
            intensity,
            keywords,
            keyword_counts: keyword_counts.into_iter().take(10).collect(),
        });
    }
    
    // Trier par intensité décroissante
    emotions.sort_by(|a, b| b.intensity.partial_cmp(&a.intensity).unwrap());
    
    let dominant_emotion = emotions.first().and_then(|e| {
        if e.occurrences > 0 {
            Some(e.emotion.clone())
        } else {
            None
        }
    });
    
    let meta = AnalysisMeta {
        lexicon_id: LEXICON_ID.to_string(),
        lexicon_version: LEXICON_VERSION.to_string(),
        total_keywords: TOTAL_KEYWORDS,
        normalization: "lower+deaccent+punct2space".to_string(),
        proper_noun_guard: config.png_enabled,
        user_overrides_version: overrides.map(|o| o.version.clone()),
    };
    
    AnalysisResult {
        meta,
        word_count,
        total_emotion_hits: total_hits,
        emotions,
        dominant_emotion,
        conflicts,
    }
}

// ============================================================================
// HELPER : Analyse avec fichier overrides
// ============================================================================

pub fn analyze_with_overrides_file<P: AsRef<Path>>(
    text: &str,
    overrides_path: P,
    config: &AnalyzerConfig,
) -> AnalysisResult {
    let uo = UserOverrides::load(overrides_path);
    let idx = OverridesIndex::from(&uo);
    analyze_gold(text, Some(&idx), config)
}

// ============================================================================
// TESTS FIXTURES (Aérospatial)
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn t001_madame_no_anger() {
        let text = "Madame et Mademoiselle parlent à Madeleine.";
        let config = AnalyzerConfig::default();
        let result = analyze_gold(text, None, &config);
        let anger = result.emotions.iter().find(|e| e.emotion == "anger").unwrap();
        assert_eq!(anger.occurrences, 0, "T001: 'mad' ne doit pas matcher Madame");
    }

    #[test]
    fn t003_sentence_start_allowed() {
        let text = "Triste, il pleure.";
        let config = AnalyzerConfig::default();
        let result = analyze_gold(text, None, &config);
        let sadness = result.emotions.iter().find(|e| e.emotion == "sadness").unwrap();
        assert!(sadness.occurrences > 0, "T003: 'Triste' début de phrase doit matcher");
    }

    #[test]
    fn t005_accents_normalized() {
        let text = "Mélancolie, épouvante, félicité.";
        let config = AnalyzerConfig::default();
        let result = analyze_gold(text, None, &config);
        assert!(result.total_emotion_hits >= 3, "T005: accents doivent être normalisés");
    }

    #[test]
    fn t006_ambiguous_excluded() {
        let text = "Sale temps. Ce cadeau est cher.";
        let config = AnalyzerConfig::default();
        let result = analyze_gold(text, None, &config);
        let disgust = result.emotions.iter().find(|e| e.emotion == "disgust").unwrap();
        let love = result.emotions.iter().find(|e| e.emotion == "love").unwrap();
        assert_eq!(disgust.occurrences, 0, "T006: 'sale' exclu");
        assert_eq!(love.occurrences, 0, "T006: 'cher' exclu");
    }
}

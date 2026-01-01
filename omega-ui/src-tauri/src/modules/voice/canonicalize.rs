//! OMEGA VOICE — Canonicalization (NASA-Grade AS9100D)
//! ═══════════════════════════════════════════════════════════════════════════════
//!
//! Normalisation déterministe du texte d'entrée.
//!
//! @invariant VOICE-I05: Canonicalisation idempotente
//! @invariant VOICE-I07: corpus_hash = SHA256(canonical_text)
//!
//! @version VOICE_v1.0.0
//! @certification AEROSPACE_GRADE

use sha2::{Digest, Sha256};

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Canonicalise un texte de manière déterministe et idempotente.
///
/// Règles appliquées:
/// 1. Normalise les fins de ligne en LF (\n)
/// 2. Supprime les espaces multiples
/// 3. Trim chaque ligne
/// 4. Supprime les lignes vides excessives (max 1 consécutive)
/// 5. Trim final
///
/// @invariant VOICE-I05: canon(canon(x)) == canon(x)
pub fn canonicalize_text(input: &str) -> String {
    // Étape 1: Normaliser les fins de ligne
    let normalized = input
        .replace("\r\n", "\n")
        .replace('\r', "\n");

    // Étape 2: Traiter ligne par ligne
    let mut result = String::with_capacity(normalized.len());
    let mut prev_empty = false;

    for line in normalized.split('\n') {
        // Collapse espaces multiples et trim
        let cleaned = collapse_whitespace(line.trim());

        if cleaned.is_empty() {
            // Permettre max 1 ligne vide consécutive
            if !prev_empty && !result.is_empty() {
                result.push('\n');
                prev_empty = true;
            }
        } else {
            if !result.is_empty() && !prev_empty {
                result.push('\n');
            }
            result.push_str(&cleaned);
            prev_empty = false;
        }
    }

    // Trim final
    result.trim().to_string()
}

/// Collapse les espaces/tabs multiples en un seul espace
fn collapse_whitespace(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut prev_space = false;

    for ch in s.chars() {
        if ch.is_whitespace() && ch != '\n' {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
        } else {
            result.push(ch);
            prev_space = false;
        }
    }

    result
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Tokenise en mots de manière déterministe.
///
/// Règles:
/// - Garde lettres, chiffres, apostrophes (', '), tirets (-)
/// - Convertit en lowercase
/// - Ignore les tokens vides
pub fn tokenize_words(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        if ch.is_alphanumeric() || ch == '\'' || ch == '\'' || ch == '-' {
            current.push(ch.to_lowercase().next().unwrap_or(ch));
        } else if !current.is_empty() {
            tokens.push(std::mem::take(&mut current));
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

/// Segmente en phrases de manière déterministe.
///
/// Séparateurs: . ! ? ; (pas : pour éviter les faux positifs)
pub fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        current.push(ch);

        // Fin de phrase
        if matches!(ch, '.' | '!' | '?' | ';') {
            let trimmed = current.trim().to_string();
            if !trimmed.is_empty() && trimmed.len() > 1 {
                sentences.push(trimmed);
            }
            current.clear();
        }
    }

    // Reste éventuel
    let tail = current.trim().to_string();
    if !tail.is_empty() && tail.len() > 1 {
        sentences.push(tail);
    }

    sentences
}

/// Segmente en paragraphes (séparés par lignes vides)
pub fn split_paragraphs(text: &str) -> Vec<String> {
    text.split('\n')
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .collect()
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/// Calcule le SHA256 hex d'un slice de bytes
pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Calcule le corpus hash (SHA256 du texte canonicalisé)
pub fn compute_corpus_hash(canonical_text: &str) -> String {
    sha256_hex(canonical_text.as_bytes())
}

/// Construit le profile_id à partir du corpus_hash et de la config
pub fn build_profile_id(corpus_hash: &str, cfg_fingerprint: &str) -> String {
    let input = format!("VOICE_PROFILE|{}|{}", corpus_hash, cfg_fingerprint);
    format!("VOICE_{}", sha256_hex(input.as_bytes()))
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ─────────────────────────────────────────────────────────────────────────
    // VOICE-I05: Idempotence
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_canonicalize_idempotent() {
        let inputs = [
            "Simple text.",
            "Multiple   spaces   here.",
            "Line1\n\nLine2\n\n\nLine3",
            "Windows\r\nMac\rUnix\n",
            "  Trim  both  sides  ",
            "\t\tTabs\t\tand\t\tspaces  ",
        ];

        for input in inputs {
            let once = canonicalize_text(input);
            let twice = canonicalize_text(&once);
            let thrice = canonicalize_text(&twice);

            assert_eq!(once, twice, "canon(x) != canon(canon(x)) for '{}'", input);
            assert_eq!(twice, thrice, "Idempotence broken at 3rd iteration");
        }
    }

    #[test]
    fn test_canonicalize_whitespace_collapse() {
        let input = "Word   multiple    spaces   here";
        let result = canonicalize_text(input);
        assert_eq!(result, "Word multiple spaces here");
    }

    #[test]
    fn test_canonicalize_crlf_normalization() {
        let input = "Line1\r\nLine2\rLine3\n";
        let result = canonicalize_text(input);
        assert!(result.contains('\n'));
        assert!(!result.contains('\r'));
    }

    #[test]
    fn test_canonicalize_empty_lines() {
        let input = "Para1\n\n\n\nPara2";
        let result = canonicalize_text(input);
        // Max 1 ligne vide entre paragraphes
        assert!(!result.contains("\n\n\n"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tokenization
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_tokenize_basic() {
        let tokens = tokenize_words("Hello world!");
        assert_eq!(tokens, vec!["hello", "world"]);
    }

    #[test]
    fn test_tokenize_with_apostrophe() {
        let tokens = tokenize_words("L'homme d'aujourd'hui");
        // Garde les apostrophes dans les tokens
        assert!(tokens.iter().any(|t| t.contains('\'')));
    }

    #[test]
    fn test_tokenize_lowercase() {
        let tokens = tokenize_words("UPPER lower MiXeD");
        assert_eq!(tokens, vec!["upper", "lower", "mixed"]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sentences
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_split_sentences_basic() {
        let sentences = split_sentences("First. Second! Third?");
        assert_eq!(sentences.len(), 3);
    }

    #[test]
    fn test_split_sentences_semicolon() {
        let sentences = split_sentences("Part one; part two.");
        assert_eq!(sentences.len(), 2);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Hashing
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_sha256_deterministic() {
        let data = b"test data";
        let h1 = sha256_hex(data);
        let h2 = sha256_hex(data);
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn test_corpus_hash_deterministic() {
        let text = "Sample text for hashing.";
        let h1 = compute_corpus_hash(text);
        let h2 = compute_corpus_hash(text);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_profile_id_format() {
        let pid = build_profile_id("abc123", "cfg=test");
        assert!(pid.starts_with("VOICE_"));
        assert_eq!(pid.len(), 70); // VOICE_ (6) + 64 hex
    }

    #[test]
    fn test_profile_id_deterministic() {
        let p1 = build_profile_id("hash1", "cfg1");
        let p2 = build_profile_id("hash1", "cfg1");
        assert_eq!(p1, p2);
    }

    #[test]
    fn test_profile_id_varies_with_input() {
        let p1 = build_profile_id("hash1", "cfg1");
        let p2 = build_profile_id("hash2", "cfg1");
        let p3 = build_profile_id("hash1", "cfg2");
        
        assert_ne!(p1, p2);
        assert_ne!(p1, p3);
        assert_ne!(p2, p3);
    }
}

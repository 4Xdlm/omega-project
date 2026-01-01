//! OMEGA VOICE - Tests Protocole Complet NASA-Grade AS9100D

#[cfg(test)]
mod voice_protocol_tests {
    use crate::interfaces::voice::contract::{
        VoiceAnalyzer, VoiceConfig, VoiceDimension, VoiceProfile,
    };
    use crate::interfaces::voice::errors::VoiceError;
    use crate::modules::voice::canonicalize::{
        canonicalize_text, compute_corpus_hash,
    };
    use crate::modules::voice::core_stats::StatsVoiceAnalyzer;
    use std::collections::BTreeSet;

    fn sample_fr_text() -> &'static str {
        "Bonjour, dit-il en souriant. Comment allez-vous aujourd'hui? Je regarde par la fenetre. Le soleil brille doucement sur les toits de Paris. Les oiseaux chantent, et une legere brise fait danser les feuilles des arbres. Tres bien, merci! repondit-elle avec enthousiasme. Et vous? Il hocha la tete, pensif. La vie etait belle, malgre tout."
    }

    fn sample_long_text() -> String {
        sample_fr_text().repeat(50)
    }

    fn sample_minimal_text() -> &'static str {
        "Bonjour. Comment ca va? Tres bien merci!"
    }

    // L2 INTEGRATION TESTS

    #[test]
    fn l2_01_full_pipeline_valid_profile() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::default();
        let result = analyzer.analyze(sample_fr_text(), &cfg).expect("Analysis should succeed");
        assert!(result.profile.validate().is_ok());
    }

    #[test]
    fn l2_02_config_validation_propagates() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::default();
        cfg.language = "invalid".to_string();
        let result = analyzer.analyze(sample_fr_text(), &cfg);
        assert!(matches!(result, Err(VoiceError::UnsupportedLanguage { .. })));
    }

    #[test]
    fn l2_03_d7_d8_disabled_fewer_metrics() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg_full = VoiceConfig::default();
        cfg_full.enable_d7_d8 = true;
        let mut cfg_limited = VoiceConfig::default();
        cfg_limited.enable_d7_d8 = false;
        let r_full = analyzer.analyze(sample_fr_text(), &cfg_full).unwrap();
        let r_limited = analyzer.analyze(sample_fr_text(), &cfg_limited).unwrap();
        assert!(r_full.profile.metrics.len() > r_limited.profile.metrics.len());
    }

    #[test]
    fn l2_04_signature_top_n_respected() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::default();
        cfg.signature_top_n = 5;
        let result = analyzer.analyze(&sample_long_text(), &cfg).unwrap();
        assert!(result.profile.signature_tokens.len() <= 5);
    }

    #[test]
    fn l2_05_different_texts_different_profiles() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::default();
        let t1 = "Le chat noir dort paisiblement sur le grand canape du salon. Il reve de souris et de poissons.";
        let t2 = "La tempete gronde avec force dans la nuit! Les eclairs illuminent le ciel sombre et mena?ant.";
        let r1 = analyzer.analyze(t1, &cfg).unwrap();
        let r2 = analyzer.analyze(t2, &cfg).unwrap();
        assert_ne!(r1.profile.corpus_hash, r2.profile.corpus_hash);
    }

    // L3 AEROSPACE TESTS

    #[test]
    fn l3_1_01_profile_id_format() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..100 {
            let text = format!("{} Test iteration numero {}", sample_minimal_text(), i);
            let result = analyzer.analyze(&text, &cfg).unwrap();
            let pid = &result.profile.profile_id;
            assert!(pid.starts_with("VOICE_"));
            assert_eq!(pid.len(), 70);
        }
    }

    #[test]
    fn l3_1_02_corpus_hash_64_hex() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..100 {
            let text = format!("{} Iteration numero {}", sample_minimal_text(), i);
            let result = analyzer.analyze(&text, &cfg).unwrap();
            assert_eq!(result.profile.corpus_hash.len(), 64);
        }
    }

    #[test]
    fn l3_1_03_determinism_1000_runs() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = sample_fr_text();
        let first = analyzer.analyze(text, &cfg).unwrap();
        for i in 1..1000 {
            let result = analyzer.analyze(text, &cfg).unwrap();
            assert_eq!(first.profile.profile_id, result.profile.profile_id, "Run {}", i);
            assert_eq!(first.profile.corpus_hash, result.profile.corpus_hash, "Run {}", i);
        }
    }

    #[test]
    fn l3_2_01_metric_bounds() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let result = analyzer.analyze(sample_fr_text(), &cfg).unwrap();
        for m in &result.profile.metrics {
            assert!(!m.value.is_nan());
            assert!(!m.value.is_infinite());
            if m.unit == "ratio" || m.unit == "entropy" {
                assert!((0.0..=1.0).contains(&m.value));
            }
        }
    }

    #[test]
    fn l3_2_02_empty_text_error() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        assert!(matches!(analyzer.analyze("", &cfg), Err(VoiceError::EmptyInput)));
    }

    #[test]
    fn l3_2_03_single_char_handled() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.min_text_length = 1;
        let _ = analyzer.analyze("A", &cfg);
    }

    #[test]
    fn l3_2_04_all_dimensions_covered() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::default();
        cfg.enable_d7_d8 = true;
        let result = analyzer.analyze(sample_fr_text(), &cfg).unwrap();
        let dims: BTreeSet<_> = result.profile.metrics.iter().map(|m| m.dimension).collect();
        for d in VoiceDimension::all() {
            assert!(dims.contains(d));
        }
    }

    #[test]
    fn l3_3_01_concurrent_style_stress() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..100 {
            let text = format!("Texte numero {}. Phrase deux. Phrase trois!", i);
            assert!(analyzer.analyze(&text, &cfg).is_ok());
        }
    }

    #[test]
    fn l3_3_02_recovery_after_errors() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let _ = analyzer.analyze("", &cfg);
        assert!(analyzer.analyze(sample_minimal_text(), &cfg).is_ok());
    }

    #[test]
    fn l3_4_01_hash_matches_manual() {
        let text = "Test simple phrase pour verification du hash.";
        let canonical = canonicalize_text(text);
        let hash = compute_corpus_hash(&canonical);
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.min_text_length = 1;
        let result = analyzer.analyze(text, &cfg).unwrap();
        assert_eq!(result.profile.corpus_hash, hash);
    }

    #[test]
    fn l3_4_02_profile_serialization_roundtrip() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let result = analyzer.analyze(sample_fr_text(), &cfg).unwrap();
        let json = serde_json::to_string(&result.profile).unwrap();
        let restored: VoiceProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(result.profile.profile_id, restored.profile_id);
    }

    // L4 INVCORE TESTS (1000 runs)

    #[test]
    fn invcore_v01_determinism_absolute() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = sample_fr_text();
        let reference = analyzer.analyze(text, &cfg).unwrap();
        for i in 0..1000 {
            let result = analyzer.analyze(text, &cfg).unwrap();
            assert_eq!(reference.profile.profile_id, result.profile.profile_id, "Run {}", i);
            for (r, t) in reference.profile.metrics.iter().zip(result.profile.metrics.iter()) {
                assert_eq!(r.value, t.value, "Run {} metric {}", i, r.key);
            }
        }
    }

    #[test]
    fn invcore_v02_metrics_sorted_stable() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..100 {
            let text = format!("{} Run numero {}", sample_minimal_text(), i);
            let result = analyzer.analyze(&text, &cfg).unwrap();
            let keys: Vec<&str> = result.profile.metrics.iter().map(|m| m.key.as_str()).collect();
            let mut sorted = keys.clone();
            sorted.sort();
            assert_eq!(keys, sorted, "Run {}", i);
        }
    }

    #[test]
    fn invcore_v03_no_nan_inf_stress() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..500 {
            let text = format!("Texte test {}. Phrase avec ponctuation! Question?", i);
            let result = analyzer.analyze(&text, &cfg).unwrap();
            for m in &result.profile.metrics {
                assert!(!m.value.is_nan(), "Run {} NaN in {}", i, m.key);
                assert!(!m.value.is_infinite(), "Run {} Inf in {}", i, m.key);
            }
        }
    }

    #[test]
    fn invcore_v04_ratios_bounded_always() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        for i in 0..500 {
            let text = format!("Test numero {} avec beaucoup de mots differents.", i);
            let result = analyzer.analyze(&text, &cfg).unwrap();
            for m in &result.profile.metrics {
                if m.unit == "ratio" || m.unit == "entropy" {
                    assert!((0.0..=1.0).contains(&m.value), "Run {} {} = {}", i, m.key, m.value);
                }
            }
        }
    }

    #[test]
    fn invcore_v05_canonicalization_idempotent() {
        for i in 0..100 {
            let input = format!("  Texte   avec   espaces  \r\n  multiples {}  ", i);
            let once = canonicalize_text(&input);
            let twice = canonicalize_text(&once);
            assert_eq!(once, twice, "Run {}", i);
        }
    }

    #[test]
    fn invcore_v06_signature_stable() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = sample_fr_text();
        let reference = analyzer.analyze(text, &cfg).unwrap();
        for i in 0..100 {
            let result = analyzer.analyze(text, &cfg).unwrap();
            assert_eq!(reference.profile.signature_tokens, result.profile.signature_tokens, "Run {}", i);
        }
    }

    #[test]
    fn invcore_v07_corpus_hash_deterministic() {
        let text = sample_fr_text();
        let canonical = canonicalize_text(text);
        let reference = compute_corpus_hash(&canonical);
        for i in 0..1000 {
            let hash = compute_corpus_hash(&canonical);
            assert_eq!(reference, hash, "Run {}", i);
        }
    }

    // L4 BRUTAL TESTS

    #[test]
    fn brutal_01_unicode_heavy() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.min_text_length = 1;
        let _ = analyzer.analyze("Emojis et accents avec du texte!", &cfg);
    }

    #[test]
    fn brutal_02_very_long_text() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let long_text = sample_long_text();
        let result = analyzer.analyze(&long_text, &cfg);
        assert!(result.is_ok());
    }

    #[test]
    fn brutal_03_all_punctuation() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.min_text_length = 1;
        let _ = analyzer.analyze("...!?!?!?...", &cfg);
    }

    #[test]
    fn brutal_04_numbers_only() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.min_text_length = 1;
        let _ = analyzer.analyze("1234567890", &cfg);
    }

    #[test]
    fn brutal_05_mixed_languages() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = "Bonjour! Hello! Guten Tag! Hola! Ciao!";
        assert!(analyzer.analyze(text, &cfg).is_ok());
    }

    #[test]
    fn brutal_06_extreme_repetition() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = "Le chat. ".repeat(500);
        assert!(analyzer.analyze(&text, &cfg).is_ok());
    }

    #[test]
    fn brutal_07_only_dialogue() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();
        let text = "Bonjour!\nSalut!\nComment vas-tu?\nTres bien!";
        assert!(analyzer.analyze(text, &cfg).is_ok());
    }

    #[test]
    fn brutal_08_config_edge_cases() {
        let analyzer = StatsVoiceAnalyzer::new();
        let mut cfg = VoiceConfig::test_config();
        cfg.signature_top_n = 1;
        assert!(analyzer.analyze(sample_fr_text(), &cfg).is_ok());
        cfg.signature_top_n = 100;
        assert!(analyzer.analyze(sample_fr_text(), &cfg).is_ok());
    }
}
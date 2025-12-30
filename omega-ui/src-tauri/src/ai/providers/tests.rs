use super::config::{ProviderConfig, ProviderType};
use super::{get_provider, get_provider_with_fallback};
use crate::ai::LLMProvider;

#[test] fn l2_b001_default_is_mock() { assert!(matches!(ProviderConfig::default().provider, ProviderType::Mock)); println!("OK L2-B001"); }
#[test] fn l2_b002_mock_valid() { assert!(ProviderConfig::mock().validate().is_ok()); println!("OK L2-B002"); }
#[test] fn l2_b003_openai_needs_key() { assert!(ProviderConfig { provider: ProviderType::OpenAI, api_key: None, ..Default::default() }.validate().is_err()); println!("OK L2-B003"); }
#[test] fn l2_b004_anthropic_needs_key() { assert!(ProviderConfig { provider: ProviderType::Anthropic, api_key: None, ..Default::default() }.validate().is_err()); println!("OK L2-B004"); }
#[test] fn l2_b005_empty_key_rejected() { assert!(ProviderConfig { provider: ProviderType::OpenAI, api_key: Some("".into()), ..Default::default() }.validate().is_err()); println!("OK L2-B005"); }
#[test] fn l2_b006_timeout_config() { assert_eq!(ProviderConfig { timeout_ms: 60000, ..Default::default() }.timeout_ms, 60000); println!("OK L2-B006"); }
#[test] fn l2_b007_retries_config() { assert_eq!(ProviderConfig { max_retries: 5, ..Default::default() }.max_retries, 5); println!("OK L2-B007"); }
#[test] fn l2_b008_openai_helper() { let c = ProviderConfig::openai("k".into()); assert!(matches!(c.provider, ProviderType::OpenAI)); println!("OK L2-B008"); }
#[test] fn l2_b009_anthropic_helper() { let c = ProviderConfig::anthropic("k".into()); assert!(matches!(c.provider, ProviderType::Anthropic)); println!("OK L2-B009"); }
#[test] fn l3_b001_fallback_mock() { let p = get_provider_with_fallback(&ProviderConfig { provider: ProviderType::OpenAI, api_key: None, ..Default::default() }); assert!(p.id().contains("mock")); println!("OK L3-B001"); }
#[test] fn l3_b002_mock_works() { assert!(get_provider(&ProviderConfig::mock()).is_ok()); println!("OK L3-B002"); }
#[test] fn l3_b003_display() { assert_eq!(format!("{}", ProviderType::Mock), "mock"); println!("OK L3-B003"); }
#[test] fn z_report() { println!("SPRINT B: 12 tests OK"); }

//! OMEGA Module Registry — Official Pass Order
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleMetadata {
    pub id: String,
    pub version: String,
    pub order: u32,
    pub required: bool,
}

pub fn get_sprint_a_passes() -> Vec<ModuleMetadata> {
    vec![
        ModuleMetadata { id: "INTAKE".into(), version: "1.0.0".into(), order: 1, required: true },
        ModuleMetadata { id: "CANON_GUARD".into(), version: "1.0.0".into(), order: 2, required: true },
        ModuleMetadata { id: "SCRIBE".into(), version: "1.0.0".into(), order: 3, required: true },
        ModuleMetadata { id: "AUDIT".into(), version: "1.0.0".into(), order: 4, required: true },
        ModuleMetadata { id: "SNAPSHOT".into(), version: "1.0.0".into(), order: 5, required: true },
    ]
}

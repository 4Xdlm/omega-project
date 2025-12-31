//! OMEGA CLI Runner — Single Entrypoint for Pipeline Execution
//! Phase 1 Production — NASA-Grade AS9100D
//! 
//! Usage: omega_run --seed 42 --mode deterministic --input-file text.txt
//! Output: Prints run_id to stdout, writes artifacts to runs/<run_id>/

use omega_ui::pipeline::{PipelineRunner, PipelineRun};
use omega_ui::pipeline::fs_utils::{ensure_dir, write_json, sha256_str};
use omega_ui::ai::MockDeterministicProvider;
use omega_ui::error::OmegaResult;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use chrono::Utc;
use uuid::Uuid;

fn main() {
    match run_cli() {
        Ok(run_id) => {
            println!("{}", run_id);
            std::process::exit(0);
        }
        Err(e) => {
            eprintln!("OMEGA_RUN_ERROR: {}", e);
            std::process::exit(1);
        }
    }
}

fn run_cli() -> OmegaResult<String> {
    let args: Vec<String> = env::args().collect();
    
    // Parse arguments
    let mut seed: u64 = 42;
    let mut mode = "deterministic".to_string();
    let mut input_file: Option<String> = None;
    let mut input_text: Option<String> = None;
    let mut output_dir = PathBuf::from("runs");
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--seed" => {
                i += 1;
                seed = args.get(i).and_then(|s| s.parse().ok()).unwrap_or(42);
            }
            "--mode" => {
                i += 1;
                mode = args.get(i).cloned().unwrap_or_else(|| "deterministic".into());
            }
            "--input-file" => {
                i += 1;
                input_file = args.get(i).cloned();
            }
            "--input" => {
                i += 1;
                input_text = args.get(i).cloned();
            }
            "--output-dir" => {
                i += 1;
                if let Some(dir) = args.get(i) {
                    output_dir = PathBuf::from(dir);
                }
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            _ => {}
        }
        i += 1;
    }
    
    // Get input text
    let input = if let Some(file) = input_file {
        fs::read_to_string(&file)
            .map_err(|e| omega_ui::error::OmegaError::ReadError(format!("Cannot read {}: {}", file, e)))?
    } else if let Some(text) = input_text {
        text
    } else {
        return Err(omega_ui::error::OmegaError::ReadError(
            "No input provided. Use --input-file or --input".into()
        ));
    };
    
    // Validate mode
    if mode != "deterministic" && mode != "hybrid" && mode != "boost" {
        return Err(omega_ui::error::OmegaError::ProviderError(
            format!("Invalid mode '{}'. Use: deterministic, hybrid, boost", mode)
        ));
    }
    
    // Create provider based on mode
    let provider: Arc<dyn omega_ui::ai::LLMProvider> = match mode.as_str() {
        "deterministic" => Arc::new(MockDeterministicProvider::default()),
        "hybrid" => Arc::new(MockDeterministicProvider::default()), // TODO: real hybrid
        "boost" => Arc::new(MockDeterministicProvider::default()),  // TODO: real boost
        _ => Arc::new(MockDeterministicProvider::default()),
    };
    
    // Generate UUID v4 for run_id (NASA-grade unique identifier)
    let run_uuid = Uuid::new_v4();
    let run_id = format!("RUN_{}", run_uuid.to_string().to_uppercase().replace("-", ""));
    
    // Run pipeline with custom run_id
    let runner = PipelineRunner::new(provider);
    let mut result = runner.run(&input, seed)?;
    
    // Override run_id with UUID-based one
    result.run_id = run_id.clone();
    
    // Create run directory
    let run_dir = output_dir.join(&run_id);
    ensure_dir(&run_dir)?;
    
    // Write artifacts
    write_run_artifacts(&run_dir, &result, &input, &mode)?;
    
    Ok(run_id)
}

fn write_run_artifacts(
    run_dir: &PathBuf,
    result: &PipelineRun,
    input: &str,
    mode: &str,
) -> OmegaResult<()> {
    // 1. Write run.json (MANDATORY)
    let run_json_path = run_dir.join("run.json");
    write_json(&run_json_path, result)?;
    
    // 2. Write input.txt (OPTIONAL - for traceability/replay)
    let input_path = run_dir.join("input.txt");
    fs::write(&input_path, input)
        .map_err(|e| omega_ui::error::OmegaError::WriteError(e.to_string()))?;
    
    // 3. Write manifest.sha256 (MANDATORY)
    let run_json_content = fs::read_to_string(&run_json_path)
        .map_err(|e| omega_ui::error::OmegaError::ReadError(e.to_string()))?;
    let run_json_hash = sha256_str(&run_json_content);
    let input_hash = sha256_str(input);
    
    let manifest_content = format!(
        "# OMEGA Run Manifest — AS9100D Compliant\n\
         # Generated: {}\n\
         # Run ID: {} (UUID v4)\n\
         # Mode: {}\n\
         # Seed: {}\n\n\
         # MANDATORY ARTIFACTS\n\
         {}  run.json\n\n\
         # OPTIONAL ARTIFACTS (traceability)\n\
         {}  input.txt\n",
        Utc::now().to_rfc3339(),
        result.run_id,
        mode,
        result.seed,
        run_json_hash,
        input_hash,
    );
    
    let manifest_path = run_dir.join("manifest.sha256");
    fs::write(&manifest_path, &manifest_content)
        .map_err(|e| omega_ui::error::OmegaError::WriteError(e.to_string()))?;
    
    // 4. Write logs.txt (MANDATORY)
    let logs_content = format!(
        "[{}] OMEGA_RUN START\n\
         [{}] run_id={} (UUID v4)\n\
         [{}] seed={}\n\
         [{}] mode={}\n\
         [{}] input_hash={}\n\
         [{}] global_hash={}\n\
         [{}] success={}\n\
         [{}] OMEGA_RUN END\n",
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        result.run_id,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        result.seed,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        mode,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        result.input_hash,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        result.global_hash,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
        result.success,
        Utc::now().format("%Y-%m-%d %H:%M:%S"),
    );
    
    let logs_path = run_dir.join("logs.txt");
    fs::write(&logs_path, &logs_content)
        .map_err(|e| omega_ui::error::OmegaError::WriteError(e.to_string()))?;
    
    Ok(())
}

fn print_help() {
    eprintln!("OMEGA CLI Runner — Phase 1 Production (AS9100D)");
    eprintln!("");
    eprintln!("USAGE:");
    eprintln!("    omega_run [OPTIONS]");
    eprintln!("");
    eprintln!("OPTIONS:");
    eprintln!("    --seed <N>           Random seed for determinism (default: 42)");
    eprintln!("    --mode <MODE>        Analysis mode: deterministic|hybrid|boost");
    eprintln!("    --input-file <FILE>  Path to input text file");
    eprintln!("    --input <TEXT>       Direct input text");
    eprintln!("    --output-dir <DIR>   Output directory (default: runs)");
    eprintln!("    -h, --help           Show this help");
    eprintln!("");
    eprintln!("OUTPUT:");
    eprintln!("    Prints run_id (UUID v4) to stdout");
    eprintln!("    Creates runs/<run_id>/ with:");
    eprintln!("      - run.json        Pipeline result (MANDATORY)");
    eprintln!("      - manifest.sha256 Hash manifest (MANDATORY)");
    eprintln!("      - logs.txt        Execution logs (MANDATORY)");
    eprintln!("      - input.txt       Original input (OPTIONAL/traceability)");
    eprintln!("");
    eprintln!("EXIT CODES:");
    eprintln!("    0  SUCCESS");
    eprintln!("    1  FAILURE");
}

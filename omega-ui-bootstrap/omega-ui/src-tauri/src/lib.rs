// ═══════════════════════════════════════════════════════════════════════════
// OMEGA UI Bootstrap — Tauri Backend
// ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use chrono::Utc;

// ─── TYPES ───

#[derive(Debug, Serialize, Deserialize)]
pub struct RunResult {
    pub timestamp: String,
    pub workspace: String,
    pub status: String, // "PASS" or "FAIL"
    pub duration_ms: u64,
    pub summary: Summary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub tests: Option<u32>,
    pub invariants: Option<u32>,
    pub notes: Vec<String>,
}

// ─── COMMANDS ───

/// Run the first cycle: validate workspace structure and check basic invariants
#[tauri::command]
pub fn run_first_cycle(workspace_path: String) -> Result<RunResult, String> {
    let start = Instant::now();
    let timestamp = Utc::now().to_rfc3339();
    
    let path = PathBuf::from(&workspace_path);
    let mut notes: Vec<String> = Vec::new();
    let mut invariants_count = 0;
    let mut all_pass = true;

    // ─── CHECK 1: Workspace exists ───
    if !path.exists() {
        return Ok(RunResult {
            timestamp,
            workspace: workspace_path,
            status: "FAIL".to_string(),
            duration_ms: start.elapsed().as_millis() as u64,
            summary: Summary {
                tests: None,
                invariants: Some(0),
                notes: vec!["Workspace path does not exist".to_string()],
            },
        });
    }
    notes.push("✓ Workspace exists".to_string());
    invariants_count += 1;

    // ─── CHECK 2: Is a directory ───
    if !path.is_dir() {
        notes.push("✗ Path is not a directory".to_string());
        all_pass = false;
    } else {
        notes.push("✓ Path is a directory".to_string());
        invariants_count += 1;
    }

    // ─── CHECK 3: Contains package.json (Node project indicator) ───
    let package_json = path.join("package.json");
    if package_json.exists() {
        notes.push("✓ package.json found".to_string());
        invariants_count += 1;
    } else {
        notes.push("⚠ No package.json found (not a Node project)".to_string());
    }

    // ─── CHECK 4: Contains .omega or omega-project.json ───
    let omega_marker = path.join(".omega");
    let omega_json = path.join("omega-project.json");
    if omega_marker.exists() || omega_json.exists() {
        notes.push("✓ OMEGA project marker found".to_string());
        invariants_count += 1;
    } else {
        notes.push("⚠ No OMEGA project marker (.omega or omega-project.json)".to_string());
    }

    // ─── CHECK 5: Contains src/ directory ───
    let src_dir = path.join("src");
    if src_dir.exists() && src_dir.is_dir() {
        notes.push("✓ src/ directory found".to_string());
        invariants_count += 1;
        
        // Count TypeScript files
        if let Ok(entries) = fs::read_dir(&src_dir) {
            let ts_count = entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "ts" || ext == "tsx")
                        .unwrap_or(false)
                })
                .count();
            if ts_count > 0 {
                notes.push(format!("✓ Found {} TypeScript files in src/", ts_count));
                invariants_count += 1;
            }
        }
    } else {
        notes.push("⚠ No src/ directory found".to_string());
    }

    // ─── CHECK 6: Contains tests/ or test files ───
    let tests_dir = path.join("tests");
    let has_tests = tests_dir.exists() && tests_dir.is_dir();
    
    if has_tests {
        notes.push("✓ tests/ directory found".to_string());
        invariants_count += 1;
    } else {
        // Check for *_test.ts files in root
        if let Ok(entries) = fs::read_dir(&path) {
            let test_files: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .file_name()
                        .map(|n| n.to_string_lossy().ends_with("_test.ts"))
                        .unwrap_or(false)
                })
                .collect();
            if !test_files.is_empty() {
                notes.push(format!("✓ Found {} test files in root", test_files.len()));
                invariants_count += 1;
            } else {
                notes.push("⚠ No tests/ directory or test files found".to_string());
            }
        }
    }

    // ─── CHECK 7: Check for tsconfig.json ───
    let tsconfig = path.join("tsconfig.json");
    if tsconfig.exists() {
        notes.push("✓ tsconfig.json found".to_string());
        invariants_count += 1;
    }

    // ─── SAVE RESULTS ───
    let duration = start.elapsed().as_millis() as u64;
    let status = if all_pass { "PASS" } else { "FAIL" };

    let result = RunResult {
        timestamp: timestamp.clone(),
        workspace: workspace_path.clone(),
        status: status.to_string(),
        duration_ms: duration,
        summary: Summary {
            tests: None,
            invariants: Some(invariants_count),
            notes: notes.clone(),
        },
    };

    // Save to output directory
    if let Err(e) = save_result(&result) {
        eprintln!("Warning: Failed to save result: {}", e);
    }

    Ok(result)
}

/// Open the output folder in file explorer
#[tauri::command]
pub fn open_output_folder() -> Result<(), String> {
    let output_dir = get_output_dir();
    
    // Create if doesn't exist
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    // Open in file explorer (platform-specific)
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&output_dir)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&output_dir)
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&output_dir)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }

    Ok(())
}

// ─── HELPERS ───

fn get_output_dir() -> PathBuf {
    // Use current directory + omega-ui-output
    let current = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    current.join("omega-ui-output")
}

fn save_result(result: &RunResult) -> Result<(), String> {
    let output_dir = get_output_dir();
    
    // Create output directory if needed
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    // Generate filename with timestamp
    let ts = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    
    // Save JSON result
    let json_path = output_dir.join(format!("{}_result.json", ts));
    let json_content = serde_json::to_string_pretty(result)
        .map_err(|e| format!("Failed to serialize result: {}", e))?;
    fs::write(&json_path, json_content)
        .map_err(|e| format!("Failed to write JSON: {}", e))?;

    // Save log file
    let log_path = output_dir.join(format!("{}_run.log", ts));
    let log_content = format!(
        "OMEGA UI First Cycle Log\n\
        ========================\n\
        Timestamp: {}\n\
        Workspace: {}\n\
        Status: {}\n\
        Duration: {}ms\n\
        \n\
        Checks:\n\
        {}\n\
        \n\
        Invariants checked: {}\n",
        result.timestamp,
        result.workspace,
        result.status,
        result.duration_ms,
        result.summary.notes.join("\n"),
        result.summary.invariants.unwrap_or(0)
    );
    fs::write(&log_path, log_content)
        .map_err(|e| format!("Failed to write log: {}", e))?;

    Ok(())
}

// ─── APP SETUP ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            run_first_cycle,
            open_output_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── TESTS ───

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_run_first_cycle_nonexistent() {
        let result = run_first_cycle("/nonexistent/path/xyz123".to_string());
        assert!(result.is_ok());
        let r = result.unwrap();
        assert_eq!(r.status, "FAIL");
        assert!(r.summary.notes.iter().any(|n| n.contains("does not exist")));
    }

    #[test]
    fn test_run_first_cycle_valid_dir() {
        // Use current directory as a valid test
        let current = env::current_dir().unwrap();
        let result = run_first_cycle(current.to_string_lossy().to_string());
        assert!(result.is_ok());
        let r = result.unwrap();
        // Should at least pass the "exists" and "is directory" checks
        assert!(r.summary.invariants.unwrap_or(0) >= 2);
    }
}

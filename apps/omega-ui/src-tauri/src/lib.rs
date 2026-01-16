//! OMEGA UI Library
//!
//! Core library for the Tauri desktop application.
//! Provides IPC commands and application setup.

use tauri::Manager;

/// Greet command for testing IPC
///
/// # Arguments
/// * `name` - The name to greet
///
/// # Returns
/// A greeting message string
#[tauri::command]
fn greet(name: &str) -> String {
    format!("OMEGA welcomes you, {}!", name)
}

/// Get application version
///
/// # Returns
/// The current application version
#[tauri::command]
fn get_version() -> String {
    String::from("3.125.0")
}

/// Health check command
///
/// # Returns
/// Health status object
#[tauri::command]
fn health_check() -> serde_json::Value {
    serde_json::json!({
        "status": "healthy",
        "version": "3.125.0",
        "phase": 125,
        "timestamp": chrono_lite_timestamp()
    })
}

/// Simple timestamp without external dependency
fn chrono_lite_timestamp() -> String {
    // Returns a placeholder; real timestamp would need chrono crate
    String::from("2026-01-16T00:00:00Z")
}

/// Run the Tauri application
///
/// Initializes and starts the desktop application with all plugins and commands.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, get_version, health_check])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

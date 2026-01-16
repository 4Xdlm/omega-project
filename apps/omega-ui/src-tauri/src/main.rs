//! OMEGA UI Desktop Application
//!
//! Main entry point for the Tauri application.
//! NASA-Grade L4 / DO-178C Level A / MIL-STD-498

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    omega_ui_lib::run()
}

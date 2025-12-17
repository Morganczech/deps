// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod project;
mod npm;

use project::scan_projects;
use npm::{get_packages, update_package};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
            scan_projects,
            get_packages,
            update_package
        ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

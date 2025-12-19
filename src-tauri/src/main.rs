#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod npm;
mod project;
mod workspace;

use tauri::Builder;

fn main() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            project::scan_projects,
            npm::get_packages,
            npm::update_package,
            npm::install_dependencies,
            npm::run_audit,
            workspace::get_last_workspace,
            workspace::save_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

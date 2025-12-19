#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod npm;
mod project;
mod workspace;
mod watcher;

use tauri::Builder;

fn main() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(watcher::WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            project::scan_projects,
            npm::get_packages,
            npm::update_package,
            npm::install_dependencies,
            npm::run_audit,
            npm::run_audit_fix,
            workspace::get_last_workspace,
            workspace::save_workspace,
            watcher::watch_project,
            watcher::unwatch_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

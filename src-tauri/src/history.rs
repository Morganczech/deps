use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PackageHistoryEntry {
    pub r#type: String, // "upgrade", "downgrade", "rollback"
    pub from: String,
    pub to: String,
    pub date: String, // ISO String
    pub note: Option<String>,
}

// Key format: project:{project_path}:package:{package_name}:history
fn get_history_key(project_path: &str, package_name: &str) -> String {
    format!("project:{}:package:{}:history", project_path, package_name)
}

#[tauri::command]
pub async fn save_package_history(
    app: AppHandle,
    project_path: String,
    package: String,
    entry: PackageHistoryEntry,
) -> Result<(), String> {
    let store = app
        .store("active_project.json") // We use a persistent store file
        .map_err(|e| format!("Failed to access store: {}", e))?;

    let key = get_history_key(&project_path, &package);
    
    // Load existing history
    let mut history: Vec<PackageHistoryEntry> = store
        .get(&key)
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Validate note length
    if let Some(note) = &entry.note {
        if note.len() > 80 {
            return Err("Note is too long (max 80 chars)".to_string());
        }
    }

    // Add new entry
    history.push(entry);

    // Keep max 20 entries (FIFO if we strictly wanted that, but usually people want latest. 
    // If we append, the latest is at the end. To keep last 20: 
    if history.len() > 20 {
        let remove_count = history.len() - 20;
        history.drain(0..remove_count);
    }

    // Save
    store.set(key, serde_json::to_value(history).unwrap());
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_package_history(
    app: AppHandle,
    project_path: String,
    package: String,
) -> Result<Vec<PackageHistoryEntry>, String> {
    let store = app
        .store("active_project.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;

    let key = get_history_key(&project_path, &package);
    
    let history: Vec<PackageHistoryEntry> = store
        .get(&key)
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Return reversed so latest is first? 
    // Usually Frontend handles sort, but let's return as stored (chronological).
    // Frontend will display latest at top (reverse).
    Ok(history)
}

#[tauri::command]
pub async fn update_last_package_history_note(
    app: AppHandle,
    project_path: String,
    package: String,
    note: String,
) -> Result<(), String> {
    if note.len() > 80 {
        return Err("Note is too long (max 80 chars)".to_string());
    }

    let store = app
        .store("active_project.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;

    let key = get_history_key(&project_path, &package);
    
    let mut history: Vec<PackageHistoryEntry> = store
        .get(&key)
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    if let Some(last) = history.last_mut() {
        last.note = Some(note);
        
        store.set(key, serde_json::to_value(history).unwrap());
        store.save().map_err(|e| format!("Failed to save store: {}", e))?;
        Ok(())
    } else {
        Err("No history found to update".to_string())
    }
}

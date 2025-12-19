use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const WORKSPACE_KEY: &str = "last_workspace";

#[tauri::command]
pub fn get_last_workspace(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;
    
    Ok(store.get(WORKSPACE_KEY).and_then(|v| v.as_str().map(String::from)))
}

#[tauri::command]
pub fn save_workspace(app: AppHandle, path: String) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;
    
    store.set(WORKSPACE_KEY, serde_json::json!(path));
    
    store
        .save()
        .map_err(|e| format!("Failed to persist store: {}", e))?;
    
    Ok(())
}

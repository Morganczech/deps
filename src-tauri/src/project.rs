use std::fs;
use std::path::Path;
use serde_json::Value;
use crate::models::Project;

#[tauri::command]
pub fn scan_projects(root_path: String) -> Result<Vec<Project>, String> {
    let path = Path::new(&root_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    let mut projects = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let package_json_path = path.join("package.json");
                if package_json_path.exists() {
                     if let Ok(content) = fs::read_to_string(&package_json_path) {
                        if let Ok(json) = serde_json::from_str::<Value>(&content) {
                            let name = json["name"].as_str().unwrap_or("Unknown").to_string();
                            let version = json["version"].as_str().unwrap_or("0.0.0").to_string();
                            
                            projects.push(Project {
                                name,
                                path: path.to_string_lossy().to_string(),
                                version,
                            });
                        }
                     }
                }
            }
        }
    }

    Ok(projects)
}

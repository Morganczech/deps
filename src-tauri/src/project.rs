use std::fs;
use std::path::{Path, PathBuf};
use serde_json::Value;
use walkdir::WalkDir;
use crate::models::Project;

const MAX_DEPTH: usize = 5;
const IGNORE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    ".cache",
    "coverage",
    "target",
    ".next",
    ".nuxt",
];

#[tauri::command]
pub fn scan_projects(root_path: String) -> Result<Vec<Project>, String> {
    let path = Path::new(&root_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    for entry in WalkDir::new(path)
        .max_depth(MAX_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            // Skip ignored directories
            if e.file_type().is_dir() {
                let dir_name = e.file_name().to_string_lossy();
                !IGNORE_DIRS.iter().any(|&ignore| dir_name == ignore)
            } else {
                true
            }
        })
    {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            
            // Look for package.json
            if entry_path.is_dir() {
                let package_json_path = entry_path.join("package.json");
                
                if package_json_path.exists() {
                    // Avoid duplicates (in case of symlinks or other edge cases)
                    let canonical_path = entry_path
                        .canonicalize()
                        .unwrap_or_else(|_| entry_path.to_path_buf());
                    
                    if !seen_paths.contains(&canonical_path) {
                        seen_paths.insert(canonical_path.clone());
                        
                        if let Some(project) = parse_project(&canonical_path, &package_json_path) {
                            projects.push(project);
                        }
                    }
                }
            }
        }
    }

    Ok(projects)
}

fn parse_project(project_path: &PathBuf, package_json_path: &PathBuf) -> Option<Project> {
    let content = fs::read_to_string(package_json_path).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    
    let name = json["name"]
        .as_str()
        .unwrap_or_else(|| {
            project_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
        })
        .to_string();
    
    let version = json["version"].as_str().unwrap_or("0.0.0").to_string();
    
    // Check write permissions
    let is_writable = !fs::metadata(package_json_path)
        .map(|m| m.permissions().readonly())
        .unwrap_or(true);
    
    // Check if node_modules exists
    let node_modules_path = project_path.join("node_modules");
    let has_node_modules = node_modules_path.exists() && node_modules_path.is_dir();
    
    Some(Project {
        name,
        path: project_path.to_string_lossy().to_string(),
        version,
        is_writable,
        has_node_modules,
    })
}

use crate::models::{Package, UpdateStatus};
use std::collections::HashMap;
use std::process::Command;
use std::path::Path;
use std::fs;
use serde::Deserialize;

const USE_MOCK: bool = false;

#[derive(Deserialize)]
struct PackageJson {
    dependencies: Option<HashMap<String, String>>,
    #[serde(rename = "devDependencies")]
    dev_dependencies: Option<HashMap<String, String>>,
}

#[derive(Deserialize)]
struct MetadataPackageJson {
    repository: Option<serde_json::Value>, // Can be string or object
    homepage: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OutdatedInfo {
    current: Option<String>,
    wanted: Option<String>,
    latest: Option<String>,
}

#[tauri::command]
#[tauri::command]
pub fn get_packages(project_path: String) -> Result<Vec<Package>, String> {
    if USE_MOCK {
        return Ok(get_mock_packages());
    }

    let mut packages = Vec::new();
    
    // 1. Parse package.json for base list
    let pkg_json_path = Path::new(&project_path).join("package.json");
    if !pkg_json_path.exists() {
        return Err("package.json not found".to_string());
    }

    let pkg_json_content = fs::read_to_string(&pkg_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;

    let pkg_json: PackageJson = serde_json::from_str(&pkg_json_content)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;

    // 2. Run npm outdated --json
    // Exit code 0 = all good, 1 = outdated packages exist.
    let output = Command::new("npm")
        .args(["outdated", "--json"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to execute npm: {}", e))?;

    let outdated_map: HashMap<String, OutdatedInfo> = if output.status.success() || output.status.code() == Some(1) {
        serde_json::from_slice(&out.stdout).unwrap_or_default()
    } else {
        // If exit code is not 0 or 1, it might be a real error (e.g. missing node_modules)
        // We can capture stderr
        let stderr = String::from_utf8_lossy(&out.stderr);
        if stderr.contains("Cannot find module") || !Path::new(&project_path).join("node_modules").exists() {
             return Err("Missing node_modules? Try running npm install.".to_string());
        }
        return Err(format!("npm exited with error: {}", stderr));
    };

    // 3. Merge
    let mut process_deps = |deps: Option<HashMap<String, String>>, is_dev: bool| {
        if let Some(d) = deps {
            for (name, version_range) in d {
                let outdated = outdated_map.get(&name);
                
                let current = outdated.and_then(|o| o.current.clone())
                    .unwrap_or_else(|| version_range.clone()); 
                
                let wanted = outdated.and_then(|o| o.wanted.clone());
                let latest = outdated.and_then(|o| o.latest.clone());
                
                let status = if let Some(out) = outdated {
                    if let (Some(w), Some(l)) = (&out.wanted, &out.latest) {
                        if w != l {
                            UpdateStatus::Major 
                        } else if out.current.as_ref() != Some(w) {
                             UpdateStatus::Minor
                        } else {
                            UpdateStatus::UpToDate
                        }
                    } else {
                        UpdateStatus::UpToDate
                    }
                } else {
                    UpdateStatus::UpToDate
                };

                // Read metadata from node_modules if exists
                let mut repository = None;
                let mut homepage = None;
                let module_pkg_path = Path::new(&project_path).join("node_modules").join(&name).join("package.json");
                
                if module_pkg_path.exists() {
                    if let Ok(content) = fs::read_to_string(&module_pkg_path) {
                        if let Ok(meta) = serde_json::from_str::<MetadataPackageJson>(&content) {
                            homepage = meta.homepage;
                            
                            // Normalize repository field
                            if let Some(repo) = meta.repository {
                                repository = match repo {
                                    serde_json::Value::String(s) => Some(s),
                                    serde_json::Value::Object(o) => o.get("url").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                    _ => None,
                                };
                                // Clean up git+ prefixes/suffixes
                                if let Some(ref mut r) = repository {
                                    *r = r.replace("git+", "").replace(".git", "");
                                }
                            }
                        }
                    }
                }

                packages.push(Package {
                    name,
                    current_version: current,
                    wanted_version: wanted,
                    latest_version: latest,
                    update_status: status,
                    is_dev,
                    repository,
                    homepage,
                });
            }
        }
    };

    process_deps(pkg_json.dependencies, false);
    process_deps(pkg_json.dev_dependencies, true);

    // Sort by name
    packages.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(packages)
}

#[tauri::command]
pub fn update_package(project_path: String, package_name: String, version: String) -> Result<(), String> {
    if USE_MOCK {
        // Just return Ok for mock mode
        return Ok(());
    }

    // Safety 1: Check if project path exists
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    // Safety 2: Check if node_modules exists
    if !path.join("node_modules").exists() {
        return Err("node_modules missing. Please run npm install first.".to_string());
    }

    // Run npm install package@version
    let output = Command::new("npm")
        .args(["install", &format!("{}@{}", package_name, version)])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to execute npm: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("npm install failed: {}", stderr));
    }

    Ok(())
}

fn get_mock_packages() -> Vec<Package> {
    vec![
        Package {
            name: "react".to_string(),
            current_version: "18.2.0".to_string(),
            wanted_version: Some("18.2.0".to_string()),
            latest_version: Some("18.3.0".to_string()),
            update_status: UpdateStatus::UpToDate,
            is_dev: false,
            homepage: Some("https://reactjs.org".to_string()),
            repository: Some("https://github.com/facebook/react".to_string()),
        },
        Package {
            name: "typescript".to_string(),
            current_version: "4.9.5".to_string(),
            wanted_version: Some("4.9.5".to_string()),
            latest_version: Some("5.3.3".to_string()),
            update_status: UpdateStatus::Major,
            is_dev: true,
            homepage: Some("https://www.typescriptlang.org".to_string()),
            repository: Some("https://github.com/microsoft/TypeScript".to_string()),
        },
        Package {
            name: "vite".to_string(),
            current_version: "5.0.0".to_string(),
            wanted_version: Some("5.0.4".to_string()),
            latest_version: Some("5.1.0".to_string()),
            update_status: UpdateStatus::Minor,
            is_dev: true,
            homepage: None,
            repository: Some("https://github.com/vitejs/vite".to_string()),
        },
        Package {
             name: "axios".to_string(),
             current_version: "0.21.1".to_string(),
             wanted_version: Some("0.21.4".to_string()),
             latest_version: Some("1.6.0".to_string()),
             update_status: UpdateStatus::Major,
             is_dev: false,
             homepage: None,
             repository: None,
        }
    ]
}

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

#[derive(Deserialize, Debug)]
struct OutdatedInfo {
    current: Option<String>,
    wanted: Option<String>,
    latest: Option<String>,
}

#[tauri::command]
pub fn get_packages(project_path: String) -> Vec<Package> {
    if USE_MOCK {
        return get_mock_packages();
    }

    let mut packages = Vec::new();
    
    // 1. Parse package.json for base list
    let pkg_json_path = Path::new(&project_path).join("package.json");
    let pkg_json_content = match fs::read_to_string(pkg_json_path) {
        Ok(c) => c,
        Err(_) => return vec![], // or error
    };

    let pkg_json: PackageJson = match serde_json::from_str(&pkg_json_content) {
        Ok(p) => p,
        Err(_) => return vec![],
    };

    // 2. Run npm outdated --json
    // Exit code 0 = all good, 1 = outdated packages exist. Both are success for us.
    let output = Command::new("npm")
        .args(["outdated", "--json"])
        .current_dir(&project_path)
        .output();

    let outdated_map: HashMap<String, OutdatedInfo> = match output {
        Ok(out) => {
            serde_json::from_slice(&out.stdout).unwrap_or_default()
        },
        Err(_) => HashMap::new(),
    };

    // 3. Merge
    let mut process_deps = |deps: Option<HashMap<String, String>>, is_dev: bool| {
        if let Some(d) = deps {
            for (name, version_range) in d {
                let outdated = outdated_map.get(&name);
                
                let current = outdated.and_then(|o| o.current.clone())
                    .unwrap_or_else(|| version_range.clone()); // Fallback to declared range if not in outdated (simplification)
                
                let wanted = outdated.and_then(|o| o.wanted.clone());
                let latest = outdated.and_then(|o| o.latest.clone());
                
                let status = if let Some(out) = outdated {
                    // Logic to determine Major/Minor
                    // Simple check on wanted vs latest
                    if let (Some(w), Some(l)) = (&out.wanted, &out.latest) {
                        if w != l {
                            UpdateStatus::Major // Wanted != Latest usually impies Major (if semantics hold)
                        } else if out.current.as_ref() != Some(w) {
                             UpdateStatus::Minor // Wanted != Current, but Wanted == Latest
                        } else {
                            UpdateStatus::UpToDate
                        }
                    } else {
                        UpdateStatus::UpToDate
                    }
                } else {
                    UpdateStatus::UpToDate
                };

                packages.push(Package {
                    name,
                    current_version: current,
                    wanted_version: wanted,
                    latest_version: latest,
                    update_status: status,
                    is_dev,
                });
            }
        }
    };

    process_deps(pkg_json.dependencies, false);
    process_deps(pkg_json.dev_dependencies, true);

    // Sort by name
    packages.sort_by(|a, b| a.name.cmp(&b.name));

    packages
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
        },
        Package {
            name: "typescript".to_string(),
            current_version: "4.9.5".to_string(),
            wanted_version: Some("4.9.5".to_string()),
            latest_version: Some("5.3.3".to_string()),
            update_status: UpdateStatus::Major,
            is_dev: true,
        },
        Package {
            name: "vite".to_string(),
            current_version: "5.0.0".to_string(),
            wanted_version: Some("5.0.4".to_string()),
            latest_version: Some("5.1.0".to_string()),
            update_status: UpdateStatus::Minor,
            is_dev: true,
        },
        Package {
             name: "axios".to_string(),
             current_version: "0.21.1".to_string(),
             wanted_version: Some("0.21.4".to_string()),
             latest_version: Some("1.6.0".to_string()),
             update_status: UpdateStatus::Major,
             is_dev: false,
        }
    ]
}

use crate::models::{Package, UpdateStatus};
use std::collections::HashMap;
use tokio::process::Command; 
use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};
use tokio::time::{timeout, Duration}; 
use tauri::{Emitter, Window};
use tokio::io::{BufReader, AsyncBufReadExt};
use std::process::Stdio;

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
pub async fn get_packages(project_path: String) -> Result<Vec<Package>, String> {
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

    // Check if node_modules exists (used for status determination mostly)
    let node_modules_exists = Path::new(&project_path).join("node_modules").exists();

    // 2. Run npm outdated --json with TIMEOUT
    // Note: npm outdated works even without node_modules, it just reports "MISSING" as current.
    
    let mut cmd = Command::new("npm");
    cmd.args(["outdated", "--json"])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true); // Ensure we don't leave zombie processes

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn npm: {}", e))?;

    let output_result = timeout(Duration::from_secs(30), child.wait_with_output()).await;

    // Soft fallback: If npm outdated fails/times out, we just have empty outdated info.
    // We do NOT want to fail the whole package list loading.
    let outdated_map: HashMap<String, OutdatedInfo> = match output_result {
        Ok(Ok(output)) => {
            if output.status.success() || output.status.code() == Some(1) {
                serde_json::from_slice(&output.stdout).unwrap_or_default()
            } else {
                 let stderr = String::from_utf8_lossy(&output.stderr);
                 println!("npm outdated failed with status {:?}: {}", output.status.code(), stderr);
                 HashMap::new()
            }
        },
        Ok(Err(e)) => {
            println!("npm outdated process error: {}", e);
            HashMap::new()
        },
        Err(_) => {
            println!("npm outdated timed out after 30 seconds");
            HashMap::new()
        }
    };

    // 3. Merge
    let mut process_deps = |deps: Option<HashMap<String, String>>, is_dev: bool| {
        if let Some(d) = deps {
            for (name, version_range) in d {
                let outdated = outdated_map.get(&name);
                
                // If node_modules is missing, current is implicitly empty/missing.
                let current = if node_modules_exists {
                    outdated.and_then(|o| o.current.clone())
                        .unwrap_or_else(|| version_range.clone())
                } else {
                    "—".to_string() 
                };
                
                let wanted = outdated.and_then(|o| o.wanted.clone());
                let latest = outdated.and_then(|o| o.latest.clone());
                
                // Determine status
                let status = if !node_modules_exists {
                    UpdateStatus::NotInstalled
                } else if let Some(out) = outdated {
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
pub async fn update_package(project_path: String, package_name: String, version: String) -> Result<(), String> {
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
        .await
        .map_err(|e| format!("Failed to execute npm: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("npm install failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn install_dependencies(window: Window, project_path: String) -> Result<(), String> {
    if USE_MOCK {
        return Ok(());
    }

    // Safety 1: Check if project path exists
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    // Safety 2: Check if package.json exists
    let package_json_path = path.join("package.json");
    if !package_json_path.exists() {
        return Err("package.json not found in project".to_string());
    }

    // Safety 3: Check if directory is writable
    if let Ok(metadata) = fs::metadata(&package_json_path) {
        if metadata.permissions().readonly() {
            return Err("Project is read-only. Cannot install dependencies.".to_string());
        }
    }

    // Run npm install with streaming
    let mut child = Command::new("npm")
        .arg("install")
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to execute npm: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let window_rx = window.clone();
    
    let w1 = window_rx.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
             let _ = w1.emit("npm-install-output", line);
        }
    });

    let w2 = window_rx.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
             let _ = w2.emit("npm-install-output", line);
        }
    });

    let status = child.wait().await.map_err(|e| format!("Failed to wait on npm: {}", e))?;

    if !status.success() {
        return Err("npm install failed".to_string());
    }

    Ok(())
}

// ... (existing code)

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuditVulnerabilityCounts {
    pub info: u32,
    pub low: u32,
    pub moderate: u32,
    pub high: u32,
    pub critical: u32,
    pub total: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VulnerablePackage {
    pub name: String,
    pub severity: String,
    pub title: String,
    pub range: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuditResult {
    pub counts: AuditVulnerabilityCounts,
    pub vulnerable_packages: Vec<VulnerablePackage>,
}

#[derive(Deserialize, Debug)]
struct AuditMetadata {
    vulnerabilities: AuditVulnerabilityCounts,
}

#[derive(Deserialize, Debug)]
struct Advisory {
    title: String,
    module_name: String,
    severity: String,
    vulnerable_versions: String,
    // ... other fields explicitly ignored
}

#[derive(Deserialize, Debug)]
struct AuditOutput {
    metadata: AuditMetadata,
    advisories: Option<HashMap<String, Advisory>>, // npm audit changes format often, but this is common for --json
    // Another format is 'vulnerabilities' object with detailed info
    vulnerabilities: Option<serde_json::Value>, 
}

#[tauri::command]
pub async fn run_audit(project_path: String) -> Result<AuditResult, String> {
    if USE_MOCK {
        return Ok(AuditResult {
            counts: AuditVulnerabilityCounts {
                info: 0,
                low: 2,
                moderate: 1,
                high: 0,
                critical: 0,
                total: 3,
            },
            vulnerable_packages: vec![
                VulnerablePackage { name: "lodash".to_string(), severity: "low".to_string(), title: "Prototype Pollution".to_string(), range: "<4.17.11".to_string() },
                VulnerablePackage { name: "axios".to_string(), severity: "high".to_string(), title: "SSRF".to_string(), range: "<0.21.2".to_string() }
            ]
        });
    }

    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    // Checking lockfile helps avoid failure, but we run anyway.
    
    println!("Spawning npm audit for: {}", project_path);
    let mut cmd = Command::new("npm");
    cmd.args(["audit", "--json"])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn npm audit: {}", e))?;

    // npm audit can take time, give it 45s for larger projects
    let output_result = timeout(Duration::from_secs(45), child.wait_with_output()).await;

    let output = match output_result {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => return Err(format!("Failed to wait for npm audit: {}", e)),
        Err(_) => return Err("npm audit timed out".to_string()),
    };

    // npm audit returns exit code 1 if vulnerabilities are found.
    // We try to parse stdout regardless.
    
    // Debug: Print raw output if needed
    // let raw_str = String::from_utf8_lossy(&output.stdout);
    // println!("Raw audit: {}", raw_str);

    let parsed: AuditOutput = serde_json::from_slice(&output.stdout)
        .map_err(|e| {
            let stderr = String::from_utf8_lossy(&output.stderr);
            format!("Failed to parse audit output: {}. Stderr: {}", e, stderr)
        })?;

    let mut vulnerable_packages = Vec::new();

    // Parse 'advisories' format (older npm) or 'vulnerabilities' (newer npm)
    // Actually, modern npm audit --json (npm 7+) structure is:
    // { "vulnerabilities": { "pkg-name": { "name": "...", "severity": "...", "via": [...] } }, "metadata": ... }
    // Or sometimes just "advisories" map.
    // For simplicity, let's try to extract from 'vulnerabilities' if it's a map of objects directly or use metadata.

    // Let's rely on 'vulnerabilities' map for now.
    // If we have detailed 'vulnerabilities', we iterate them.
    if let Some(vulns) = parsed.vulnerabilities {
       if let serde_json::Value::Object(map) = vulns {
           for (name, val) in map {
               // In npm 7+, 'val' has 'severity', 'via' (array/string), 'range' etc.
               // We try to extract best effort info.
               let severity = val.get("severity").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
               
               // Avoid listing packages with "info" severity or transitive internal nodes if possible, 
               // but 'vulnerabilities' usually lists top-level or flattened meaningful ones.
               if severity == "info" { continue; }

               let range = val.get("range").and_then(|v| v.as_str()).unwrap_or("").to_string();
               
               // Title is tricky in new format, often inside 'via'.
               let title = if let Some(via) = val.get("via") {
                   if let Some(arr) = via.as_array() {
                       if let Some(first) = arr.first() {
                            if let Some(obj) = first.as_object() {
                                obj.get("title").and_then(|t| t.as_str()).unwrap_or("Vulnerability").to_string()
                            } else {
                                "Direct/Transitive Vulnerability".to_string()
                            }
                       } else {
                           "Vulnerability".to_string()
                       }
                   } else {
                       "Vulnerability".to_string()
                   }
               } else {
                   "Vulnerability".to_string()
               };

               vulnerable_packages.push(VulnerablePackage {
                   name,
                   severity,
                   title,
                   range,
               });
           }
       }
    }
    // Fallback: if 'advisories' exists (older npm), parse it.
    else if let Some(advisories) = parsed.advisories {
        for (_, adv) in advisories {
            vulnerable_packages.push(VulnerablePackage {
                name: adv.module_name,
                severity: adv.severity,
                title: adv.title,
                range: adv.vulnerable_versions,
            });
        }
    }

    Ok(AuditResult {
        counts: parsed.metadata.vulnerabilities,
        vulnerable_packages,
    })
}

fn get_mock_packages() -> Vec<Package> {
// ...
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

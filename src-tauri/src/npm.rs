use crate::models::{Package, UpdateStatus};

#[tauri::command]
pub fn get_packages(_project_path: String) -> Vec<Package> {
    // Return MOCK data for now
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

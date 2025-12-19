use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, Window};

pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watched_path: Mutex<Option<PathBuf>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_path: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn watch_project(
    window: Window,
    state: tauri::State<'_, WatcherState>,
    project_path: String,
) -> Result<(), String> {
    let path = Path::new(&project_path);
    let target_file = path.join("package.json");
    
    // Stop existing watcher if any
    {
        let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
        if watcher_guard.is_some() {
            *watcher_guard = None;
        }
        let mut path_guard = state.watched_path.lock().map_err(|e| e.to_string())?;
        *path_guard = None;
    }

    if !path.exists() {
        return Err("Project path not found".to_string());
    }

    // Re-create watcher with closure
    let window_clone = window.clone();
    let target_file_clone = target_file.clone();
    
    let event_handler = move |res: notify::Result<notify::Event>| {
        match res {
            Ok(event) => {
                // Check if any of the affected paths is our package.json
                let relevant = event.paths.iter().any(|p| p.file_name() == target_file_clone.file_name());
                
                if relevant {
                    println!("File changed: {:?}", target_file_clone);
                    let _ = window_clone.emit("project-file-change", ());
                }
            },
            Err(e) => println!("watch error: {:?}", e),
        }
    };

    let mut watcher = RecommendedWatcher::new(event_handler, Config::default())
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to start watching: {}", e))?;

     {
        let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
        *watcher_guard = Some(watcher);
        let mut path_guard = state.watched_path.lock().map_err(|e| e.to_string())?;
        *path_guard = Some(path.to_path_buf());
    }

    Ok(())
}

#[tauri::command]
pub fn unwatch_project(state: tauri::State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *watcher_guard = None;
    let mut path_guard = state.watched_path.lock().map_err(|e| e.to_string())?;
    *path_guard = None;
    println!("Stopped watcher");
    Ok(())
}

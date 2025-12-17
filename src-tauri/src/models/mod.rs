use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub version: String,
    pub is_writable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum UpdateStatus {
    UpToDate,
    Minor,
    Major,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Package {
    pub name: String,
    pub current_version: String,
    pub wanted_version: Option<String>,
    pub latest_version: Option<String>,
    pub update_status: UpdateStatus,
    pub is_dev: bool,
}

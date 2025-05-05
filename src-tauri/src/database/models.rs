use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub connection_string: Option<String>,
    pub options: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct ConnectionResponse {
    pub connection_id: String,
    pub message: String,
    pub success: bool,
}

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub affected_rows: Option<u64>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DatabaseItem {
    pub name: String,
    pub item_type: String,
    pub children: Option<Vec<DatabaseItem>>,
}

#[derive(Debug, Serialize)]
pub struct DatabaseStructure {
    pub items: Vec<DatabaseItem>,
}
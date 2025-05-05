pub mod models;
pub mod sqlite;
pub mod mongodb;
pub mod postgres;

use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use uuid::Uuid;
use std::sync::Arc;

// Store connections in memory using a global variable
pub static SQLITE_CONNECTIONS: Lazy<Mutex<HashMap<String, rusqlite::Connection>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

pub static MONGO_CONNECTIONS: Lazy<Mutex<HashMap<String, ::mongodb::Client>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

pub static POSTGRES_CONNECTIONS: Lazy<Mutex<HashMap<String, Arc<tokio_postgres::Client>>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

pub fn generate_connection_id() -> String {
    Uuid::new_v4().to_string()
}
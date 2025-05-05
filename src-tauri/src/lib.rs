// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod database;

use database::{sqlite, mongodb, postgres};
use database::models::{ConnectionConfig, QueryResult, ConnectionResponse};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn connect_sqlite(path: String) -> Result<ConnectionResponse, String> {
    match sqlite::connect_sqlite(&path) {
        Ok(connection_id) => Ok(ConnectionResponse { 
            connection_id, 
            message: "SQLite connection established".to_string(),
            success: true 
        }),
        Err(e) => Ok(ConnectionResponse { 
            connection_id: "".to_string(), 
            message: format!("Failed to connect to SQLite database: {}", e),
            success: false
        }),
    }
}

#[tauri::command]
async fn connect_mongodb(config: ConnectionConfig) -> Result<ConnectionResponse, String> {
    match mongodb::connect_mongodb(&config).await {
        Ok(connection_id) => Ok(ConnectionResponse { 
            connection_id, 
            message: "MongoDB connection established".to_string(),
            success: true 
        }),
        Err(e) => Ok(ConnectionResponse { 
            connection_id: "".to_string(), 
            message: format!("Failed to connect to MongoDB: {}", e),
            success: false
        }),
    }
}

#[tauri::command]
async fn connect_postgres(config: ConnectionConfig) -> Result<ConnectionResponse, String> {
    match postgres::connect_postgres(&config).await {
        Ok(connection_id) => Ok(ConnectionResponse { 
            connection_id, 
            message: "PostgreSQL connection established".to_string(),
            success: true 
        }),
        Err(e) => Ok(ConnectionResponse { 
            connection_id: "".to_string(), 
            message: format!("Failed to connect to PostgreSQL: {}", e),
            success: false
        }),
    }
}

#[tauri::command]
async fn execute_query(connection_id: String, query: String, db_type: String) -> Result<QueryResult, String> {
    match db_type.as_str() {
        "sqlite" => sqlite::execute_query(connection_id, query),
        "mongodb" => mongodb::execute_query(connection_id, query).await,
        "postgres" => postgres::execute_query(connection_id, query).await,
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}

#[tauri::command]
async fn get_tables(connection_id: String) -> Result<Vec<String>, String> {
    sqlite::get_database_structure(&connection_id)
}

#[tauri::command]
async fn list_databases(connection_id: String) -> Result<Vec<String>, String> {
    // This function handles all database types
    if connection_id.is_empty() {
        return Err("Invalid connection ID".to_string());
    }
    
    // Check MongoDB connections first
    if let Ok(dbs) = mongodb::list_databases(&connection_id).await {
        return Ok(dbs);
    }
    
    // Check PostgreSQL connections
    if let Ok(dbs) = postgres::list_databases(&connection_id).await {
        return Ok(dbs);
    }
    
    Err("Could not find connection or the database type doesn't support listing databases".to_string())
}

#[tauri::command]
async fn list_collections(connection_id: String, db_name: String) -> Result<Vec<String>, String> {
    mongodb::list_collections(&connection_id, &db_name).await
}

#[tauri::command]
async fn list_tables(connection_id: String, schema: Option<String>) -> Result<Vec<String>, String> {
    postgres::list_tables(&connection_id, schema.as_deref()).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            connect_sqlite,
            connect_mongodb,
            connect_postgres,
            execute_query,
            get_tables,
            list_databases,
            list_collections,
            list_tables
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

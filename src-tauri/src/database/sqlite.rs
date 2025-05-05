use crate::database::{SQLITE_CONNECTIONS, generate_connection_id};
use crate::database::models::QueryResult;
use rusqlite::{Connection, params};
use serde_json::Value;
use std::path::Path;

pub fn connect_sqlite(path: &str) -> Result<String, String> {
    let connection_path = Path::new(path);
    
    // Check if the file exists or if it's :memory:
    let connection = if path == ":memory:" || connection_path.exists() {
        match Connection::open(path) {
            Ok(conn) => conn,
            Err(e) => return Err(format!("Failed to connect to SQLite database: {}", e)),
        }
    } else {
        return Err(format!("Database file does not exist: {}", path));
    };
    
    let connection_id = generate_connection_id();
    
    // Store the connection
    let mut connections = SQLITE_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    connections.insert(connection_id.clone(), connection);
    
    Ok(connection_id)
}

pub fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    let connections = SQLITE_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    
    if let Some(conn) = connections.get(&connection_id) {
        // Check if it's a SELECT query or other type (INSERT, UPDATE, DELETE, etc.)
        let query_lowercase = query.to_lowercase();
        let is_select = query_lowercase.trim_start().starts_with("select");
        
        if is_select {
            // Handle SELECT queries
            let mut stmt = match conn.prepare(&query) {
                Ok(stmt) => stmt,
                Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
            };
            
            // Get column names
            let column_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
            
            // Execute the query and collect results
            let mut rows = Vec::new();
            
            let mut row_result = match stmt.query(params![]) {
                Ok(row_result) => row_result,
                Err(e) => return Err(format!("Failed to execute query: {}", e)),
            };
            
            while let Ok(Some(row)) = row_result.next() {
                let mut row_data = serde_json::Map::new();
                
                for (i, column_name) in column_names.iter().enumerate() {
                    let value: Value = match row.get_ref(i) {
                        Ok(rusqlite::types::ValueRef::Null) => Value::Null,
                        Ok(rusqlite::types::ValueRef::Integer(i)) => Value::Number(i.into()),
                        Ok(rusqlite::types::ValueRef::Real(f)) => {
                            // Convert to serde_json::Number, handling possible NaN/infinite values
                            match serde_json::Number::from_f64(f) {
                                Some(num) => Value::Number(num),
                                None => Value::String(f.to_string()),
                            }
                        },
                        Ok(rusqlite::types::ValueRef::Text(s)) => {
                            Value::String(String::from_utf8_lossy(s).into_owned())
                        },
                        Ok(rusqlite::types::ValueRef::Blob(b)) => {
                            Value::String(format!("BLOB({} bytes)", b.len()))
                        },
                        Err(e) => Value::String(format!("Error: {}", e)),
                    };
                    
                    row_data.insert(column_name.clone(), value);
                }
                
                rows.push(Value::Object(row_data));
            }
            
            Ok(QueryResult {
                columns: column_names,
                rows,
                affected_rows: None,
                success: true,
                error: None,
            })
        } else {
            // Handle non-SELECT queries
            match conn.execute(&query, params![]) {
                Ok(affected) => Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: Some(affected as u64),
                    success: true,
                    error: None,
                }),
                Err(e) => Err(format!("Failed to execute query: {}", e)),
            }
        }
    } else {
        Err(format!("Connection with ID {} not found", connection_id))
    }
}

pub fn close_connection(connection_id: &str) -> Result<(), String> {
    let mut connections = SQLITE_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    
    if connections.remove(connection_id).is_some() {
        Ok(())
    } else {
        Err(format!("Connection with ID {} not found", connection_id))
    }
}

pub fn get_database_structure(connection_id: &str) -> Result<Vec<String>, String> {
    let connections = SQLITE_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    
    if let Some(conn) = connections.get(connection_id) {
        // Get all table names
        let mut stmt = match conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name") {
            Ok(stmt) => stmt,
            Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
        };
        
        let table_names: Result<Vec<String>, _> = stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query tables: {}", e))?
            .collect();
            
        table_names.map_err(|e| format!("Failed to collect table names: {}", e))
    } else {
        Err(format!("Connection with ID {} not found", connection_id))
    }
}
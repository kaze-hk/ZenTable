use crate::database::{POSTGRES_CONNECTIONS, generate_connection_id};
use crate::database::models::{ConnectionConfig, QueryResult};
use tokio_postgres::NoTls;
use serde_json::{Value, json, Map};
use std::sync::Arc;

pub async fn connect_postgres(config: &ConnectionConfig) -> Result<String, String> {
    let connection_string = match &config.connection_string {
        Some(uri) => uri.clone(),
        None => {
            // Build connection string from individual parameters
            let host_default = "localhost".to_string();
            let port_default = 5432;
            let username_default = "postgres".to_string();
            let database_default = "postgres".to_string();
            
            let host = config.host.as_ref().unwrap_or(&host_default);
            let port = config.port.unwrap_or(port_default);
            let username = config.username.as_ref().unwrap_or(&username_default);
            let database = config.database.as_ref().unwrap_or(&database_default);
            
            let mut conn_str = format!("host={} port={} user={} dbname={}", 
                host, port, username, database);
            
            if let Some(pass) = &config.password {
                conn_str.push_str(&format!(" password={}", pass));
            }
            
            conn_str
        }
    };
    
    // Connect to the database
    let (client, connection) = match tokio_postgres::connect(&connection_string, NoTls).await {
        Ok((client, connection)) => (client, connection),
        Err(e) => return Err(format!("Failed to connect to PostgreSQL: {}", e)),
    };
    
    // Wrap the client in an Arc to make it shareable
    let client = Arc::new(client);
    
    // Spawn a task to drive the connection to completion
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("PostgreSQL connection error: {}", e);
        }
    });
    
    let connection_id = generate_connection_id();
    
    // Store the connection
    let mut connections = POSTGRES_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    connections.insert(connection_id.clone(), client);
    
    Ok(connection_id)
}

pub async fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    // Get the client reference without holding the lock for too long
    let client_ref = {
        let connections = POSTGRES_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        
        match connections.get(&connection_id) {
            Some(client) => Arc::clone(client),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // Now we can use the Arc<Client> outside the mutex lock
    let client = &*client_ref;
    
    // Check if the query is a SELECT statement to determine how to handle it
    let query_lowercase = query.trim().to_lowercase();
    let is_select = query_lowercase.starts_with("select") || 
                    query_lowercase.starts_with("with") ||
                    query_lowercase.starts_with("show") ||
                    query_lowercase.starts_with("explain");
    
    if is_select {
        // Execute a SELECT query
        match client.query(&query, &[]).await {
            Ok(rows) => {
                // Get column information
                let mut columns = Vec::new();
                if !rows.is_empty() {
                    for column in rows[0].columns() {
                        columns.push(column.name().to_string());
                    }
                }
                
                // Process rows
                let mut result_rows = Vec::new();
                for row in rows {
                    let mut row_map = Map::new();
                    
                    for (i, column) in row.columns().iter().enumerate() {
                        let column_name = column.name();
                        
                        // Get the value based on PostgreSQL types
                        let value = match row.try_get::<_, Option<&str>>(i) {
                            Ok(Some(val)) => json!(val),
                            Ok(None) => Value::Null,
                            Err(_) => {
                                // Try other types
                                match row.try_get::<_, Option<i32>>(i) {
                                    Ok(Some(val)) => json!(val),
                                    Ok(None) => Value::Null,
                                    Err(_) => {
                                        match row.try_get::<_, Option<i64>>(i) {
                                            Ok(Some(val)) => json!(val),
                                            Ok(None) => Value::Null,
                                            Err(_) => {
                                                match row.try_get::<_, Option<f64>>(i) {
                                                    Ok(Some(val)) => json!(val),
                                                    Ok(None) => Value::Null,
                                                    Err(_) => {
                                                        match row.try_get::<_, Option<bool>>(i) {
                                                            Ok(Some(val)) => json!(val),
                                                            Ok(None) => Value::Null,
                                                            Err(_) => {
                                                                // Try to get as string representation for other types
                                                                json!(format!("{:?}", row.get::<_, String>(i)))
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        };
                        
                        row_map.insert(column_name.to_string(), value);
                    }
                    
                    result_rows.push(Value::Object(row_map));
                }
                
                let rows_len = result_rows.len() as u64;
                Ok(QueryResult {
                    columns,
                    rows: result_rows,
                    affected_rows: Some(rows_len),
                    success: true,
                    error: None,
                })
            },
            Err(e) => Err(format!("Failed to execute PostgreSQL query: {}", e)),
        }
    } else {
        // Execute a non-SELECT query
        match client.execute(&query, &[]).await {
            Ok(affected) => Ok(QueryResult {
                columns: Vec::new(),
                rows: Vec::new(),
                affected_rows: Some(affected),
                success: true,
                error: None,
            }),
            Err(e) => Err(format!("Failed to execute PostgreSQL query: {}", e)),
        }
    }
}

pub async fn list_databases(connection_id: &str) -> Result<Vec<String>, String> {
    // Get the client reference without holding the lock for too long
    let client_ref = {
        let connections = POSTGRES_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        
        match connections.get(connection_id) {
            Some(client) => Arc::clone(client),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // Now we can use the Arc<Client> outside the mutex lock
    let client = &*client_ref;
    
    // Query to list all databases
    let query = "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname";
    let rows = match client.query(query, &[]).await {
        Ok(rows) => rows,
        Err(e) => return Err(format!("Failed to list databases: {}", e)),
    };
    
    let mut db_names = Vec::new();
    for row in rows {
        match row.try_get::<_, String>(0) {
            Ok(name) => db_names.push(name),
            Err(_) => continue,
        }
    }
    
    Ok(db_names)
}

pub async fn list_tables(connection_id: &str, schema: Option<&str>) -> Result<Vec<String>, String> {
    // Get the client reference without holding the lock for too long
    let client_ref = {
        let connections = POSTGRES_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        
        match connections.get(connection_id) {
            Some(client) => Arc::clone(client),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // Now we can use the Arc<Client> outside the mutex lock
    let client = &*client_ref;
    
    // Query to list all tables in a schema (defaults to public)
    let schema_name = schema.unwrap_or("public");
    let query = "SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename";
    let rows = match client.query(query, &[&schema_name]).await {
        Ok(rows) => rows,
        Err(e) => return Err(format!("Failed to list tables: {}", e)),
    };
    
    let mut table_names = Vec::new();
    for row in rows {
        match row.try_get::<_, String>(0) {
            Ok(name) => table_names.push(name),
            Err(_) => continue,
        }
    }
    
    Ok(table_names)
}
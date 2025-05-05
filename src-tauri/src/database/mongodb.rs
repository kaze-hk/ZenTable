use crate::database::{MONGO_CONNECTIONS, generate_connection_id};
use crate::database::models::{ConnectionConfig, QueryResult};
use mongodb::{Client, options::ClientOptions};
use serde_json::{Value, json};
use futures::StreamExt;
use mongodb::bson::{self, Document, doc};

pub async fn connect_mongodb(config: &ConnectionConfig) -> Result<String, String> {
    let connection_string = match &config.connection_string {
        Some(uri) => uri.clone(),
        None => {
            // Build connection string from individual parameters
            let host_default = "localhost".to_string();
            let host = config.host.as_ref().unwrap_or(&host_default);
            let port = config.port.unwrap_or(27017);
            let username = config.username.as_ref().map(|u| format!("{}:", u)).unwrap_or_default();
            let password = config.password.as_ref().map(|p| format!("{}@", p)).unwrap_or_default();
            let auth = if !username.is_empty() || !password.is_empty() {
                format!("{}{}", username, password)
            } else {
                "".to_string()
            };
            let database = config.database.as_ref().map(|db| format!("/{}", db)).unwrap_or_default();
            
            format!("mongodb://{}{}:{}{}", auth, host, port, database)
        }
    };
    
    // Parse the connection string into ClientOptions
    let client_options = match ClientOptions::parse(&connection_string).await {
        Ok(options) => options,
        Err(e) => return Err(format!("Failed to parse MongoDB connection string: {}", e)),
    };
    
    // Create a new client
    let client = match Client::with_options(client_options) {
        Ok(client) => client,
        Err(e) => return Err(format!("Failed to connect to MongoDB: {}", e)),
    };
    
    // Test the connection by pinging the server
    match client.database("admin").run_command(doc! {"ping": 1}, None).await {
        Ok(_) => {},
        Err(e) => return Err(format!("Failed to ping MongoDB server: {}", e)),
    }
    
    let connection_id = generate_connection_id();
    
    // Store the connection
    let mut connections = MONGO_CONNECTIONS.lock().map_err(|e| e.to_string())?;
    connections.insert(connection_id.clone(), client);
    
    Ok(connection_id)
}

pub async fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    // Get a clone of the client to avoid MutexGuard across await points
    let client = {
        let connections = MONGO_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        match connections.get(&connection_id) {
            Some(client) => client.clone(),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // Parse the query as JSON
    let query_json: Value = match serde_json::from_str(&query) {
        Ok(json) => json,
        Err(e) => return Err(format!("Failed to parse MongoDB query as JSON: {}", e)),
    };
    
    // Extract database and collection names
    let db_name = match query_json.get("db").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => return Err("MongoDB query must include a 'db' field".to_string()),
    };
    
    let collection_name = match query_json.get("collection").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => return Err("MongoDB query must include a 'collection' field".to_string()),
    };
    
    // Get the database and collection
    let db = client.database(db_name);
    let collection = db.collection::<Document>(collection_name);
    
    // Determine the operation type
    match query_json.get("operation").and_then(|v| v.as_str()) {
        Some("find") => {
            // Extract the filter, if present
            let filter = match query_json.get("filter") {
                Some(filter_value) => {
                    match bson::to_document(&filter_value) {
                        Ok(doc) => doc,
                        Err(e) => return Err(format!("Failed to parse filter: {}", e)),
                    }
                },
                None => Document::new(),
            };
            
            // Execute the find operation
            let mut cursor = match collection.find(filter, None).await {
                Ok(cursor) => cursor,
                Err(e) => return Err(format!("Failed to execute MongoDB find: {}", e)),
            };
            
            // Collect the results
            let mut rows = Vec::new();
            let mut columns = Vec::new();
            let mut column_set = std::collections::HashSet::new();

            while let Some(result) = cursor.next().await {
                match result {
                    Ok(doc) => {
                        // Extract column names from the document
                        for key in doc.keys() {
                            if !column_set.contains(key) {
                                column_set.insert(key.clone());
                                columns.push(key.clone());
                            }
                        }
                        
                        // Convert to JSON
                        match bson::to_bson(&doc) {
                            Ok(bson) => {
                                match serde_json::to_value(&bson) {
                                    Ok(json) => rows.push(json),
                                    Err(e) => rows.push(json!({"error": format!("Failed to convert document to JSON: {}", e)})),
                                }
                            },
                            Err(e) => rows.push(json!({"error": format!("Failed to convert document to BSON: {}", e)})),
                        }
                    },
                    Err(e) => return Err(format!("Error while iterating MongoDB cursor: {}", e)),
                }
            }
            
            let row_count = rows.len() as u64;
            Ok(QueryResult {
                columns,
                rows,
                affected_rows: Some(row_count),
                success: true,
                error: None,
            })
        },
        Some("insertOne") => {
            // Extract the document
            let doc = match query_json.get("document") {
                Some(doc_value) => {
                    match bson::to_document(&doc_value) {
                        Ok(doc) => doc,
                        Err(e) => return Err(format!("Failed to parse document: {}", e)),
                    }
                },
                None => return Err("MongoDB insertOne operation requires a 'document' field".to_string()),
            };
            
            // Execute the insertOne operation
            match collection.insert_one(doc, None).await {
                Ok(result) => {
                    let inserted_id = match serde_json::to_value(&result.inserted_id) {
                        Ok(val) => val,
                        Err(e) => json!({"error": format!("Failed to convert inserted ID: {}", e)}),
                    };
                    
                    Ok(QueryResult {
                        columns: vec!["insertedId".to_string()],
                        rows: vec![json!({"insertedId": inserted_id})],
                        affected_rows: Some(1),
                        success: true,
                        error: None,
                    })
                },
                Err(e) => Err(format!("Failed to execute MongoDB insertOne: {}", e)),
            }
        },
        Some(op) => Err(format!("Unsupported MongoDB operation: {}", op)),
        None => Err("MongoDB query must include an 'operation' field".to_string()),
    }
}

pub async fn list_databases(connection_id: &str) -> Result<Vec<String>, String> {
    // Get a clone of the client to avoid MutexGuard across await points
    let client = {
        let connections = MONGO_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        match connections.get(connection_id) {
            Some(client) => client.clone(),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // List all databases
    let db_names = match client.list_database_names(None, None).await {
        Ok(names) => names,
        Err(e) => return Err(format!("Failed to list databases: {}", e)),
    };
    
    Ok(db_names)
}

pub async fn list_collections(connection_id: &str, db_name: &str) -> Result<Vec<String>, String> {
    // Get a clone of the client to avoid MutexGuard across await points
    let client = {
        let connections = MONGO_CONNECTIONS.lock().map_err(|e| e.to_string())?;
        match connections.get(connection_id) {
            Some(client) => client.clone(),
            None => return Err(format!("Connection with ID {} not found", connection_id)),
        }
    };
    
    // Get the database
    let db = client.database(db_name);
    
    // List all collections in the database
    let collection_names = match db.list_collection_names(None).await {
        Ok(names) => names,
        Err(e) => return Err(format!("Failed to list collections: {}", e)),
    };
    
    Ok(collection_names)
}
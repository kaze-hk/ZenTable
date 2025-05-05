export enum DatabaseType {
  SQLITE = 'sqlite',
  MONGODB = 'mongodb',
  POSTGRESQL = 'postgres',
}

export interface Connection {
  name?: string;
  type: DatabaseType;
  connectionId?: string;
  
  // SQLite specific
  path?: string;
  
  // MongoDB and PostgreSQL specific
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  connectionString?: string;
  options?: Record<string, string>;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  affected_rows?: number;
  success: boolean;
  error?: string;
}

export interface DatabaseStructure {
  name: string;
  type: string;
  children?: DatabaseStructure[];
}
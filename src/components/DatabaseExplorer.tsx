import { useState, useEffect } from 'react';
import { Card, Title, Stack, List, Text, Loader, Center, NavLink } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { Connection, DatabaseType } from '../types';
import { FiDatabase, FiTable, FiList } from 'react-icons/fi';

interface DatabaseExplorerProps {
  connection: Connection | null;
  onQuerySelect: (query: string) => void;
}

interface DbItem {
  name: string;
  type: string;
  children?: DbItem[];
}

export default function DatabaseExplorer({ connection, onQuerySelect }: DatabaseExplorerProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<DbItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection || !connection.connectionId) {
      setItems([]);
      return;
    }

    const fetchDatabaseStructure = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let structureItems: DbItem[] = [];
        
        if (connection.type === DatabaseType.SQLITE) {
          // For SQLite, get all tables
          const tables: string[] = await invoke('get_tables', { connectionId: connection.connectionId });
          structureItems = tables.map(tableName => ({
            name: tableName,
            type: 'table'
          }));
        } 
        else if (connection.type === DatabaseType.MONGODB) {
          // For MongoDB, get all databases and collections
          const databases: string[] = await invoke('list_databases', { connectionId: connection.connectionId });
          
          const dbItems: DbItem[] = [];
          for (const dbName of databases) {
            const collections: string[] = await invoke('list_collections', { 
              connectionId: connection.connectionId,
              dbName
            });
            
            dbItems.push({
              name: dbName,
              type: 'database',
              children: collections.map(collName => ({
                name: collName,
                type: 'collection'
              }))
            });
          }
          structureItems = dbItems;
        }
        else if (connection.type === DatabaseType.POSTGRESQL) {
          // For PostgreSQL, get all databases, schemas, and tables
          const databases: string[] = await invoke('list_databases', { connectionId: connection.connectionId });
          
          const connectedDb = connection.database || '';
          if (connectedDb) {
            // Get tables in the public schema by default
            const tables: string[] = await invoke('list_tables', { 
              connectionId: connection.connectionId,
              schema: 'public'
            });
            
            structureItems = [{
              name: connectedDb,
              type: 'database',
              children: [{
                name: 'public',
                type: 'schema',
                children: tables.map(tableName => ({
                  name: tableName,
                  type: 'table'
                }))
              }]
            }];
          }
        }
        
        setItems(structureItems);
      } catch (err) {
        console.error('Error fetching database structure:', err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchDatabaseStructure();
  }, [connection]);

  const handleItemClick = (item: DbItem, parentDb?: string) => {
    let query = '';
    
    if (connection) {
      if (connection.type === DatabaseType.SQLITE) {
        if (item.type === 'table') {
          query = `SELECT * FROM "${item.name}" LIMIT 100;`;
        }
      } 
      else if (connection.type === DatabaseType.MONGODB) {
        if (item.type === 'collection' && parentDb) {
          query = JSON.stringify({
            db: parentDb,
            collection: item.name,
            operation: 'find',
            filter: {}
          }, null, 2);
        }
      }
      else if (connection.type === DatabaseType.POSTGRESQL) {
        if (item.type === 'table') {
          query = `SELECT * FROM "${item.name}" LIMIT 100;`;
        }
      }
      
      if (query) {
        onQuerySelect(query);
      }
    }
  };

  if (loading) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Loader size="lg" />
        </Center>
      </Card>
    );
  }

  if (error) {
    return (
      <Card withBorder p="md" radius="md">
        <Stack>
          <Title order={4}>Error</Title>
          <Text color="red">{error}</Text>
        </Stack>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Text color="dimmed" align="center">
            Connect to a database to explore its structure
          </Text>
        </Center>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Text color="dimmed" align="center">
            No objects found in the database
          </Text>
        </Center>
      </Card>
    );
  }

  return (
    <Card withBorder p="md" radius="md">
      <Stack>
        <Title order={4}>Database Explorer</Title>
        
        {connection.type === DatabaseType.SQLITE && (
          <List spacing="xs" size="sm">
            {items.map((item, index) => (
              <List.Item 
                key={`${item.type}-${item.name}-${index}`}
                icon={<FiTable size={16} />}
                onClick={() => handleItemClick(item)}
              >
                <NavLink 
                  label={item.name}
                  component="div"
                  active={false}
                  variant="light"
                />
              </List.Item>
            ))}
          </List>
        )}
        
        {connection.type === DatabaseType.MONGODB && (
          <List spacing="xs" size="sm">
            {items.map((db, dbIndex) => (
              <List.Item 
                key={`db-${db.name}-${dbIndex}`}
                icon={<FiDatabase size={16} />}
              >
                <NavLink
                  label={db.name}
                  childrenOffset={28}
                >
                  {db.children && db.children.map((coll, collIndex) => (
                    <NavLink
                      key={`coll-${coll.name}-${collIndex}`}
                      label={coll.name}
                      icon={<FiList size={14} />}
                      onClick={() => handleItemClick(coll, db.name)}
                      active={false}
                    />
                  ))}
                </NavLink>
              </List.Item>
            ))}
          </List>
        )}
        
        {connection.type === DatabaseType.POSTGRESQL && (
          <List spacing="xs" size="sm">
            {items.map((db, dbIndex) => (
              <List.Item 
                key={`db-${db.name}-${dbIndex}`}
                icon={<FiDatabase size={16} />}
              >
                <NavLink
                  label={db.name}
                  childrenOffset={28}
                >
                  {db.children && db.children.map((schema, schemaIndex) => (
                    <NavLink
                      key={`schema-${schema.name}-${schemaIndex}`}
                      label={schema.name}
                      childrenOffset={28}
                    >
                      {schema.children && schema.children.map((table, tableIndex) => (
                        <NavLink
                          key={`table-${table.name}-${tableIndex}`}
                          label={table.name}
                          icon={<FiTable size={14} />}
                          onClick={() => handleItemClick(table)}
                          active={false}
                        />
                      ))}
                    </NavLink>
                  ))}
                </NavLink>
              </List.Item>
            ))}
          </List>
        )}
      </Stack>
    </Card>
  );
}
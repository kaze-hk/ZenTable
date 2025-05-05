import { useState, useEffect } from 'react';
import { Card, Title, Stack, List, Text, Loader, Center, NavLink, Accordion, Box, Badge, Group } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { Connection, DatabaseType } from '../types';
import { FiDatabase, FiTable, FiList, FiFolder, FiChevronRight } from 'react-icons/fi';
import { SiMongodb } from 'react-icons/si';

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
  const [expandedDbs, setExpandedDbs] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<{db: string, collection: string} | null>(null);

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
          
          // If we have databases, expand the first one by default
          if (dbItems.length > 0 && dbItems[0].children && dbItems[0].children.length > 0) {
            setExpandedDbs([dbItems[0].name]);
          }
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

  const toggleExpandDb = (dbName: string) => {
    setExpandedDbs(prev => {
      if (prev.includes(dbName)) {
        return prev.filter(name => name !== dbName);
      } else {
        return [...prev, dbName];
      }
    });
  };
  
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
          // Set active collection
          setActiveCollection({ db: parentDb, collection: item.name });
          
          // Create MongoDB query to show documents
          query = JSON.stringify({
            db: parentDb,
            collection: item.name,
            operation: 'find',
            filter: {}
          }, null, 2);
        } else if (item.type === 'database') {
          // Toggle database expansion
          toggleExpandDb(item.name);
          return;
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
          <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {items.map((db, dbIndex) => (
              <Box 
                key={`db-${db.name}-${dbIndex}`}
                mb="xs"
              >
                <NavLink
                  icon={<SiMongodb size={20} color="#00ED64" />}
                  label={
                    <Group position="apart" spacing={5} noWrap>
                      <Text fw={600}>{db.name}</Text>
                      <Badge size="xs" color="green">{db.children?.length || 0}</Badge>
                    </Group>
                  }
                  onClick={() => handleItemClick(db)}
                  rightSection={
                    <FiChevronRight 
                      size={16} 
                      style={{ 
                        transform: expandedDbs.includes(db.name) ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  }
                  active={expandedDbs.includes(db.name)}
                />
                
                {expandedDbs.includes(db.name) && db.children && (
                  <Box pl={36} mt={5}>
                    {db.children.map((coll, collIndex) => (
                      <NavLink
                        key={`coll-${coll.name}-${collIndex}`}
                        label={coll.name}
                        icon={<FiFolder size={16} color="#FFD94D" />}
                        onClick={() => handleItemClick(coll, db.name)}
                        active={activeCollection?.db === db.name && activeCollection?.collection === coll.name}
                        variant={activeCollection?.db === db.name && activeCollection?.collection === coll.name ? "filled" : "light"}
                        color={activeCollection?.db === db.name && activeCollection?.collection === coll.name ? "blue" : undefined}
                        mb={5}
                        sx={(theme) => ({
                          fontSize: theme.fontSizes.sm,
                          borderRadius: theme.radius.sm,
                          '&:hover': {
                            backgroundColor: 
                              activeCollection?.db === db.name && 
                              activeCollection?.collection === coll.name ? 
                              theme.colors.blue[7] : 
                              theme.colorScheme === 'dark' ? 
                              theme.colors.dark[6] : 
                              theme.colors.gray[1]
                          }
                        })}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
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
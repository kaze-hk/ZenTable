import { useState, useEffect } from 'react';
import { 
  Tabs, 
  TextInput, 
  PasswordInput, 
  NumberInput, 
  Button, 
  Stack, 
  Card, 
  Text
} from '@mantine/core';
import { DatabaseType, Connection } from '../types';
import { open } from '@tauri-apps/plugin-dialog';
import { Notifications } from '@mantine/notifications';

interface ConnectionPanelProps {
  onConnect: (connection: Connection) => void;
  loading: boolean;
  initialConnection?: Connection | null;
}

export default function ConnectionPanel({ onConnect, loading, initialConnection }: ConnectionPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>('sqlite');
  const [sqlitePath, setSqlitePath] = useState<string | null>(null);
  const [sqliteFile, setSqliteFile] = useState<File | null>(null);
  
  const [mongoConnectionString, setMongoConnectionString] = useState<string>('');
  const [mongoHost, setMongoHost] = useState<string>('localhost');
  const [mongoPort, setMongoPort] = useState<number>(27017);
  const [mongoUsername, setMongoUsername] = useState<string>('');
  const [mongoPassword, setMongoPassword] = useState<string>('');
  const [mongoDatabase, setMongoDatabase] = useState<string>('');
  const [mongoUseConnectionString, setMongoUseConnectionString] = useState<boolean>(false);
  
  const [pgConnectionString, setPgConnectionString] = useState<string>('');
  const [pgHost, setPgHost] = useState<string>('localhost');
  const [pgPort, setPgPort] = useState<number>(5432);
  const [pgUsername, setPgUsername] = useState<string>('postgres');
  const [pgPassword, setPgPassword] = useState<string>('');
  const [pgDatabase, setPgDatabase] = useState<string>('postgres');
  const [pgUseConnectionString, setPgUseConnectionString] = useState<boolean>(false);

  const [connectionName, setConnectionName] = useState<string>('');

  // Initialize form values when editing an existing connection
  useEffect(() => {
    if (initialConnection) {
      setConnectionName(initialConnection.name || '');
      
      if (initialConnection.type === DatabaseType.SQLITE) {
        setActiveTab('sqlite');
        setSqlitePath(initialConnection.path || null);
        // 清空文件状态，因为只有路径可用
        setSqliteFile(null);
      }
      else if (initialConnection.type === DatabaseType.MONGODB) {
        setActiveTab('mongodb');
        setMongoConnectionString(initialConnection.connectionString || '');
        setMongoHost(initialConnection.host || 'localhost');
        setMongoPort(initialConnection.port || 27017);
        setMongoUsername(initialConnection.username || '');
        setMongoPassword(initialConnection.password || '');
        setMongoDatabase(initialConnection.database || '');
        setMongoUseConnectionString(!!initialConnection.connectionString);
      }
      else if (initialConnection.type === DatabaseType.POSTGRESQL) {
        setActiveTab('postgres');
        setPgConnectionString(initialConnection.connectionString || '');
        setPgHost(initialConnection.host || 'localhost');
        setPgPort(initialConnection.port || 5432);
        setPgUsername(initialConnection.username || 'postgres');
        setPgPassword(initialConnection.password || '');
        setPgDatabase(initialConnection.database || 'postgres');
        setPgUseConnectionString(!!initialConnection.connectionString);
      }
    }
  }, [initialConnection]);

  const handleSqliteConnect = () => {
    if (!sqlitePath) return;
    
    onConnect({
      name: connectionName,
      type: DatabaseType.SQLITE,
      path: sqlitePath,
      connectionId: initialConnection?.connectionId
    });
  };

  const handleMongoConnect = () => {
    onConnect({
      name: connectionName,
      type: DatabaseType.MONGODB,
      connectionString: mongoUseConnectionString ? mongoConnectionString : undefined,
      host: mongoUseConnectionString ? undefined : mongoHost,
      port: mongoUseConnectionString ? undefined : mongoPort,
      username: mongoUseConnectionString ? undefined : mongoUsername || undefined,
      password: mongoUseConnectionString ? undefined : mongoPassword || undefined,
      database: mongoUseConnectionString ? undefined : mongoDatabase || undefined,
      connectionId: initialConnection?.connectionId
    });
  };

  const handlePostgresConnect = () => {
    onConnect({
      name: connectionName,
      type: DatabaseType.POSTGRESQL,
      connectionString: pgUseConnectionString ? pgConnectionString : undefined,
      host: pgUseConnectionString ? undefined : pgHost,
      port: pgUseConnectionString ? undefined : pgPort,
      username: pgUseConnectionString ? undefined : pgUsername,
      password: pgUseConnectionString ? undefined : pgPassword,
      database: pgUseConnectionString ? undefined : pgDatabase,
      connectionId: initialConnection?.connectionId
    });
  };

  return (
    <Stack>
      <TextInput
        label="Connection Name (optional)"
        placeholder="My Database"
        value={connectionName}
        onChange={(e) => setConnectionName(e.currentTarget.value)}
      />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="sqlite">SQLite</Tabs.Tab>
          <Tabs.Tab value="mongodb">MongoDB</Tabs.Tab>
          <Tabs.Tab value="postgres">PostgreSQL</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="sqlite" pt="xs">
          <Card withBorder shadow="sm" mt="md" p="md">
            <Stack>
              <Text fw={500}>Connect to SQLite Database</Text>
              <Button 
                fullWidth
                variant="outline" 
                onClick={async () => {
                  try {
                    // 使用Tauri的dialog API打开文件选择器
                    const selected = await open({
                      multiple: false,
                      filters: [{
                        name: 'SQLite Database', 
                        extensions: ['db', 'sqlite', 'sqlite3']
                      }]
                    });
                    
                    if (selected) {
                      // 如果用户选择了文件
                      if (typeof selected === 'string') {
                        setSqlitePath(selected);
                        // 显示文件名作为UI反馈
                        const fileName = selected.split('/').pop() || selected.split('\\').pop() || selected;
                        setSqliteFile({ name: fileName } as any);
                      } else if (Array.isArray(selected) && selected.length > 0) {
                        setSqlitePath(selected[0]);
                        const fileName = selected[0].split('/').pop() || selected[0].split('\\').pop() || selected[0];
                        setSqliteFile({ name: fileName } as any);
                      }
                    }
                  } catch (err) {
                    console.error('Error selecting SQLite file:', err);
                    Notifications.show({
                      title: '文件选择错误',
                      message: `选择文件时出错: ${err}`,
                      color: 'red'
                    });
                  }
                }}
              >
                选择SQLite数据库文件
              </Button>
              
              {sqliteFile && (
                <Text size="sm" ta="center" fw={500}>
                  已选择: {(sqliteFile as any).name}
                </Text>
              )}
              
              {sqlitePath && (
                <Text size="sm" color="dimmed">路径: {sqlitePath}</Text>
              )}
              
              <Button 
                onClick={handleSqliteConnect}
                loading={loading}
                disabled={!sqlitePath}
                fullWidth
                color="blue"
              >
                {initialConnection ? '更新连接' : '连接'}
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="mongodb" pt="xs">
          <Card withBorder shadow="sm" mt="md" p="md">
            <Stack>
              <Text fw={500}>Connect to MongoDB</Text>
              
              <Tabs>
                <Tabs.List>
                  <Tabs.Tab 
                    value="standard" 
                    onClick={() => setMongoUseConnectionString(false)}
                  >
                    Standard
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="connection-string" 
                    onClick={() => setMongoUseConnectionString(true)}
                  >
                    Connection String
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="standard" pt="xs">
                  <Stack mt="md">
                    <TextInput
                      label="Host"
                      placeholder="localhost"
                      value={mongoHost}
                      onChange={(e) => setMongoHost(e.currentTarget.value)}
                    />
                    <NumberInput
                      label="Port"
                      placeholder="27017"
                      value={mongoPort}
                      onChange={(val) => setMongoPort(Number(val))}
                      min={1}
                      max={65535}
                    />
                    <TextInput
                      label="Database (optional)"
                      placeholder="Database name"
                      value={mongoDatabase}
                      onChange={(e) => setMongoDatabase(e.currentTarget.value)}
                    />
                    <TextInput
                      label="Username (optional)"
                      placeholder="Username"
                      value={mongoUsername}
                      onChange={(e) => setMongoUsername(e.currentTarget.value)}
                    />
                    <PasswordInput
                      label="Password (optional)"
                      placeholder="Password"
                      value={mongoPassword}
                      onChange={(e) => setMongoPassword(e.currentTarget.value)}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="connection-string" pt="xs">
                  <TextInput
                    mt="md"
                    label="Connection String"
                    placeholder="mongodb://username:password@localhost:27017/database"
                    value={mongoConnectionString}
                    onChange={(e) => setMongoConnectionString(e.currentTarget.value)}
                  />
                </Tabs.Panel>
              </Tabs>
              
              <Button 
                onClick={handleMongoConnect}
                loading={loading}
                disabled={(mongoUseConnectionString && !mongoConnectionString) || 
                          (!mongoUseConnectionString && !mongoHost)}
                fullWidth
                mt="md"
              >
                {initialConnection ? 'Update' : 'Connect'}
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="postgres" pt="xs">
          <Card withBorder shadow="sm" mt="md" p="md">
            <Stack>
              <Text fw={500}>Connect to PostgreSQL</Text>
              
              <Tabs>
                <Tabs.List>
                  <Tabs.Tab 
                    value="standard" 
                    onClick={() => setPgUseConnectionString(false)}
                  >
                    Standard
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="connection-string" 
                    onClick={() => setPgUseConnectionString(true)}
                  >
                    Connection String
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="standard" pt="xs">
                  <Stack mt="md">
                    <TextInput
                      label="Host"
                      placeholder="localhost"
                      value={pgHost}
                      onChange={(e) => setPgHost(e.currentTarget.value)}
                    />
                    <NumberInput
                      label="Port"
                      placeholder="5432"
                      value={pgPort}
                      onChange={(val) => setPgPort(Number(val))}
                      min={1}
                      max={65535}
                    />
                    <TextInput
                      label="Database"
                      placeholder="postgres"
                      value={pgDatabase}
                      onChange={(e) => setPgDatabase(e.currentTarget.value)}
                    />
                    <TextInput
                      label="Username"
                      placeholder="postgres"
                      value={pgUsername}
                      onChange={(e) => setPgUsername(e.currentTarget.value)}
                    />
                    <PasswordInput
                      label="Password"
                      placeholder="Password"
                      value={pgPassword}
                      onChange={(e) => setPgPassword(e.currentTarget.value)}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="connection-string" pt="xs">
                  <TextInput
                    mt="md"
                    label="Connection String"
                    placeholder="postgresql://user:password@localhost:5432/database"
                    value={pgConnectionString}
                    onChange={(e) => setPgConnectionString(e.currentTarget.value)}
                  />
                </Tabs.Panel>
              </Tabs>
              
              <Button 
                onClick={handlePostgresConnect}
                loading={loading}
                disabled={(pgUseConnectionString && !pgConnectionString) || 
                          (!pgUseConnectionString && !pgHost)}
                fullWidth
                mt="md"
              >
                {initialConnection ? 'Update' : 'Connect'}
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
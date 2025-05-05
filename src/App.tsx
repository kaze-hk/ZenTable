import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  AppShell, 
  Burger, 
  Button, 
  Group, 
  Stack, 
  Tabs, 
  useComputedColorScheme, 
  useMantineColorScheme,
  Grid,
  Modal,
  Box
} from "@mantine/core";
import { Notifications } from '@mantine/notifications';
import "./App.css";
import ConnectionPanel from "./components/ConnectionPanel";
import QueryPanel from "./components/QueryPanel";
import ResultsPanel from "./components/ResultsPanel";
import DatabaseExplorer from "./components/DatabaseExplorer";
import ConnectionList from "./components/ConnectionList";
import HeroSection from "./components/HeroSection";
import { DatabaseType, Connection } from "./types";

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [greetMsg, setGreetMsg] = useState("");
  const [opened, setOpened] = useState(false);
  
  // Modals state
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showDBInterface, setShowDBInterface] = useState(false);

  const toggleColorScheme = () =>
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');

  // Load saved connections from localStorage
  useEffect(() => {
    const savedConnections = localStorage.getItem('zentable-connections');
    if (savedConnections) {
      try {
        setConnections(JSON.parse(savedConnections));
      } catch (err) {
        console.error('Failed to parse saved connections', err);
      }
    }
  }, []);

  // Save connections to localStorage whenever they change
  useEffect(() => {
    if (connections.length > 0) {
      localStorage.setItem('zentable-connections', JSON.stringify(connections));
    }
  }, [connections]);

  const handleConnect = async (connection: Connection) => {
    try {
      setLoading(true);
      let response;
      
      if (connection.type === DatabaseType.SQLITE) {
        response = await invoke("connect_sqlite", { path: connection.path });
      } else if (connection.type === DatabaseType.MONGODB) {
        response = await invoke("connect_mongodb", { 
          config: {
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            database: connection.database,
            connection_string: connection.connectionString,
            options: connection.options
          }
        });
      } else if (connection.type === DatabaseType.POSTGRESQL) {
        response = await invoke("connect_postgres", { 
          config: {
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            database: connection.database,
            connection_string: connection.connectionString,
            options: connection.options
          }
        });
      }
      
      if (response && response.success) {
        const connWithId = {
          ...connection,
          connectionId: response.connection_id
        };
        
        // Check if connection already exists in history
        const existingIndex = connections.findIndex(conn => 
          (conn.connectionId === connection.connectionId) || 
          (conn.type === connection.type && 
            ((conn.path && conn.path === connection.path) || 
             (conn.host === connection.host && conn.port === connection.port && conn.database === connection.database)))
        );
        
        if (existingIndex >= 0) {
          // Update existing connection
          const updatedConnections = [...connections];
          updatedConnections[existingIndex] = connWithId;
          setConnections(updatedConnections);
        } else {
          // Add new connection to history
          setConnections(prev => [connWithId, ...prev]);
        }
        
        setActiveConnection(connWithId);
        setShowDBInterface(true);
        
        Notifications.show({
          title: 'Connection Successful',
          message: response.message,
          color: 'green'
        });
      } else {
        Notifications.show({
          title: 'Connection Failed',
          message: response.message,
          color: 'red'
        });
      }
    } catch (error) {
      Notifications.show({
        title: 'Connection Error',
        message: String(error),
        color: 'red'
      });
    } finally {
      setLoading(false);
      setShowConnectionDialog(false);
    }
  };
  
  const handleAddConnection = () => {
    setConnectionToEdit(null);
    setShowConnectionDialog(true);
  };
  
  const handleEditConnection = (connection: Connection) => {
    setConnectionToEdit(connection);
    setShowConnectionDialog(true);
  };
  
  const handleDeleteConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.connectionId !== connectionId));
    
    // If the deleted connection was active, clear the active connection
    if (activeConnection?.connectionId === connectionId) {
      setActiveConnection(null);
      setShowDBInterface(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!activeConnection || !query.trim()) return;
    
    try {
      setLoading(true);
      const response = await invoke("execute_query", { 
        connectionId: activeConnection.connectionId, 
        query, 
        dbType: activeConnection.type.toLowerCase() 
      });
      
      // Safely handle the response
      if (response) {
        setResults(response);
        
        if (response.error) {
          Notifications.show({
            title: 'Query Error',
            message: response.error,
            color: 'red'
          });
        }
      } else {
        setResults(null);
        Notifications.show({
          title: 'Query Error',
          message: 'No response received from the server',
          color: 'red'
        });
      }
    } catch (error) {
      console.error('Query execution error:', error);
      setResults(null);
      Notifications.show({
        title: 'Query Error',
        message: String(error),
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 尝试调用一个基本的Tauri API函数
    invoke("greet", { name: "Tauri User" })
      .then((response) => {
        console.log("Tauri API响应:", response);
        setGreetMsg(String(response));
      })
      .catch((error) => {
        console.error("Tauri API调用出错:", error);
        setGreetMsg("无法连接到Tauri后端");
      });
  }, []);
  
  // Database interface component that shows when a connection is active
  const DatabaseInterface = () => (
    <AppShell
      padding="md"
      navbar={{ 
        width: 250, 
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      header={{ 
        height: 60
      }}
    >
      <AppShell.Header p="xs">
        <Group justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
              ZenTable{activeConnection?.name ? ` - ${activeConnection.name}` : ''}
            </div>
          </Group>
          <Group>
            <Button
              variant="subtle"
              onClick={toggleColorScheme}
            >
              {computedColorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                setActiveConnection(null);
                setShowDBInterface(false);
              }}
            >
              Close Connection
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Tabs defaultValue="explorer">
          <Tabs.List>
            <Tabs.Tab value="explorer">Explorer</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="explorer" pt="xs">
            <DatabaseExplorer 
              connection={activeConnection} 
              onQuerySelect={(selectedQuery) => setQuery(selectedQuery)} 
            />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="md">
          <QueryPanel 
            query={query} 
            setQuery={setQuery} 
            onExecute={handleExecuteQuery} 
            loading={loading} 
            disabled={!activeConnection} 
          />
          <ResultsPanel results={results} loading={loading} />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );

  // Home view with hero section and connections list
  const HomeView = () => (
    <Box p="md">
      <Grid gutter="md" style={{ minHeight: 'calc(100vh - 32px)' }}>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <HeroSection onAddConnection={handleAddConnection} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ConnectionList
            connections={connections}
            onConnect={handleConnect}
            onEdit={handleEditConnection}
            onDelete={handleDeleteConnection}
            onAddNew={handleAddConnection}
            loading={loading}
            activeConnectionId={activeConnection?.connectionId}
          />
        </Grid.Col>
      </Grid>
      
      <Modal 
        opened={showConnectionDialog} 
        onClose={() => setShowConnectionDialog(false)} 
        title={connectionToEdit ? "Edit Connection" : "New Connection"}
        size="lg"
      >
        <ConnectionPanel 
          onConnect={handleConnect} 
          loading={loading} 
          initialConnection={connectionToEdit}
        />
      </Modal>
    </Box>
  );
  
  return (
    <>
      <Notifications position="top-right" />
      {showDBInterface && activeConnection ? <DatabaseInterface /> : <HomeView />}
    </>
  );
}

export default App;

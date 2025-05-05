import { useState } from 'react';
import { 
  Card, 
  Title, 
  Stack, 
  Group, 
  Text, 
  ActionIcon, 
  Button, 
  Modal,
  Box,
  ThemeIcon,
  Tooltip,
  Badge
} from '@mantine/core';
import { FiDatabase, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { Connection, DatabaseType } from '../types';
import ConnectionPanel from './ConnectionPanel';

interface ConnectionListProps {
  connections: Connection[];
  onConnect: (connection: Connection) => void;
  onEdit: (connection: Connection) => void;
  onDelete: (connectionId: string) => void;
  onAddNew: () => void;
  loading: boolean;
  activeConnectionId?: string;
}

export default function ConnectionList({ 
  connections, 
  onConnect, 
  onEdit, 
  onDelete,
  onAddNew,
  loading,
  activeConnectionId 
}: ConnectionListProps) {
  
  const getDatabaseIcon = (type: DatabaseType) => {
    switch (type) {
      case DatabaseType.SQLITE:
        return <ThemeIcon color="blue" variant="light" size="lg"><FiDatabase size={18} /></ThemeIcon>;
      case DatabaseType.MONGODB:
        return <ThemeIcon color="green" variant="light" size="lg"><FiDatabase size={18} /></ThemeIcon>;
      case DatabaseType.POSTGRESQL:
        return <ThemeIcon color="violet" variant="light" size="lg"><FiDatabase size={18} /></ThemeIcon>;
    }
  };
  
  const getDatabaseType = (type: DatabaseType) => {
    switch (type) {
      case DatabaseType.SQLITE:
        return <Badge color="blue" variant="light">SQLite</Badge>;
      case DatabaseType.MONGODB:
        return <Badge color="green" variant="light">MongoDB</Badge>;
      case DatabaseType.POSTGRESQL:
        return <Badge color="violet" variant="light">PostgreSQL</Badge>;
    }
  };
  
  const getConnectionDetails = (connection: Connection) => {
    if (connection.type === DatabaseType.SQLITE) {
      return connection.path;
    } else if (connection.type === DatabaseType.MONGODB || connection.type === DatabaseType.POSTGRESQL) {
      if (connection.connectionString) {
        return connection.connectionString;
      } else {
        return `${connection.host}:${connection.port}${connection.database ? `/${connection.database}` : ''}`;
      }
    }
    return '';
  };

  return (
    <Card p="md" radius="md" h="100%">
      <Stack spacing="md">
        <Group position="apart">
          <Title order={4}>Recent Connections</Title>
          <Button 
            leftSection={<FiPlus />}
            onClick={onAddNew}
            size="sm"
          >
            Add Connection
          </Button>
        </Group>

        {connections.length === 0 ? (
          <Text color="dimmed" align="center" py="xl">
            No connections yet. Create a new one to get started.
          </Text>
        ) : (
          <Stack spacing="xs">
            {connections.map((connection) => (
              <Card 
                key={connection.connectionId} 
                withBorder 
                p="sm"
                sx={(theme) => ({
                  backgroundColor: activeConnectionId === connection.connectionId 
                    ? theme.colorScheme === 'dark' 
                      ? theme.colors.dark[6]
                      : theme.colors.gray[1]
                    : undefined,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.colorScheme === 'dark' 
                      ? theme.colors.dark[5]
                      : theme.colors.gray[0]
                  }
                })}
                onClick={() => onConnect(connection)}
                onDoubleClick={() => onConnect(connection)}
              >
                <Group position="apart" noWrap>
                  <Group spacing="sm" noWrap>
                    {getDatabaseIcon(connection.type)}
                    <Stack spacing={0}>
                      <Text fw={500}>{connection.name || getConnectionDetails(connection)}</Text>
                      <Text size="xs" color="dimmed">{getConnectionDetails(connection)}</Text>
                    </Stack>
                  </Group>
                  <Group spacing="xs" noWrap>
                    {getDatabaseType(connection.type)}
                    <Tooltip label="Edit">
                      <ActionIcon 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(connection);
                        }}
                      >
                        <FiEdit2 size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon 
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(connection.connectionId || '');
                        }}
                      >
                        <FiTrash2 size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
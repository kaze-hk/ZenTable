import { useState } from 'react';
import { Textarea, Button, Group, Card, Title, Stack } from '@mantine/core';

interface QueryPanelProps {
  query: string;
  setQuery: (query: string) => void;
  onExecute: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function QueryPanel({ 
  query, 
  setQuery, 
  onExecute, 
  loading, 
  disabled 
}: QueryPanelProps) {
  return (
    <Card withBorder p="md" radius="md">
      <Stack spacing="sm">
        <Title order={4}>Query Editor</Title>
        
        <Textarea
          placeholder="Enter your query here..."
          minRows={6}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          disabled={disabled}
        />
        
        <Group position="right">
          <Button
            onClick={onExecute}
            loading={loading}
            disabled={disabled || !query.trim()}
          >
            Execute Query
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
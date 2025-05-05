import { Table, Card, Title, Stack, Text, Loader, Center, Badge, ScrollArea } from '@mantine/core';
import { QueryResult } from '../types';

interface ResultsPanelProps {
  results: QueryResult | null;
  loading: boolean;
}

export default function ResultsPanel({ results, loading }: ResultsPanelProps) {
  if (loading) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Loader size="lg" />
        </Center>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Text color="dimmed" align="center">
            Execute a query to see results
          </Text>
        </Center>
      </Card>
    );
  }

  if (!results.success && results.error) {
    return (
      <Card withBorder p="md" radius="md">
        <Stack>
          <Title order={4}>Error</Title>
          <Text color="red">{results.error}</Text>
        </Stack>
      </Card>
    );
  }

  const { columns, rows, affected_rows } = results;

  if (rows.length === 0) {
    return (
      <Card withBorder p="md" radius="md">
        <Stack>
          <Title order={4}>Results</Title>
          {affected_rows !== undefined && (
            <Text>
              Query executed successfully. {affected_rows} rows affected.
            </Text>
          )}
          <Text color="dimmed">No data returned.</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder p="md" radius="md">
      <Stack spacing="sm">
        <Group position="apart">
          <Title order={4}>Results</Title>
          <Badge>{rows.length} rows</Badge>
        </Group>

        <ScrollArea>
          <Table striped highlightOnHover withBorder withColumnBorders>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={`${column}-${index}`}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((column, colIndex) => (
                    <td key={`cell-${rowIndex}-${colIndex}`}>
                      {renderCellValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

function renderCellValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}
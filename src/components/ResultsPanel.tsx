import { Table, Card, Title, Stack, Text, Loader, Center, Badge, ScrollArea, Group, Code } from '@mantine/core';
import { QueryResult } from '../types';
import { useState, useEffect } from 'react';

interface ResultsPanelProps {
  results: QueryResult | null;
  loading: boolean;
}

export default function ResultsPanel({ results, loading }: ResultsPanelProps) {
  const [processedResults, setProcessedResults] = useState<QueryResult | null>(null);
  
  // Process the results to ensure they're safe to render
  useEffect(() => {
    if (!results) {
      setProcessedResults(null);
      return;
    }
    
    try {
      // Create a safe copy of the results
      const safeResults: QueryResult = {
        columns: Array.isArray(results.columns) ? results.columns : [],
        rows: Array.isArray(results.rows) ? results.rows : [],
        affected_rows: results.affected_rows,
        success: results.success,
        error: results.error,
      };
      setProcessedResults(safeResults);
    } catch (err) {
      console.error("Error processing query results:", err);
      setProcessedResults({
        columns: [],
        rows: [],
        affected_rows: 0,
        success: false,
        error: "Failed to process results: " + String(err)
      });
    }
  }, [results]);

  if (loading) {
    return (
      <Card withBorder p="md" radius="md">
        <Center style={{ height: 200 }}>
          <Loader size="lg" />
        </Center>
      </Card>
    );
  }

  if (!processedResults) {
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

  if (!processedResults.success && processedResults.error) {
    return (
      <Card withBorder p="md" radius="md">
        <Stack>
          <Title order={4}>Error</Title>
          <Text color="red">{processedResults.error}</Text>
        </Stack>
      </Card>
    );
  }

  const { columns, rows, affected_rows } = processedResults;

  if (!Array.isArray(rows) || rows.length === 0) {
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

function renderCellValue(value: any): JSX.Element {
  if (value === null || value === undefined) {
    return <Text color="dimmed">NULL</Text>;
  }
  
  if (typeof value === 'object') {
    try {
      const jsonString = JSON.stringify(value, null, 2);
      return <Code block>{jsonString}</Code>;
    } catch (e) {
      return <Text color="red">Error displaying object</Text>;
    }
  }
  
  return <>{String(value)}</>;
}
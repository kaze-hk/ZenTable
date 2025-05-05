import { Text, Title, Button, Stack, Group, ThemeIcon } from '@mantine/core';
import { FiDatabase, FiGrid, FiZap, FiPlus } from 'react-icons/fi';

interface HeroSectionProps {
  onAddConnection: () => void;
}

export default function HeroSection({ onAddConnection }: HeroSectionProps) {
  return (
    <Stack spacing="xl" p="xl" justify="center" h="100%">
      <Title order={1} size="h1">
        <Group spacing="xs" align="center">
          <ThemeIcon size={48} radius="md" variant="light">
            <FiDatabase size={30} />
          </ThemeIcon>
          ZenTable
        </Group>
      </Title>

      <Text size="lg" c="dimmed" maw={500}>
        A modern database management tool for SQLite, MongoDB, and PostgreSQL databases
      </Text>

      <Button 
        size="lg" 
        onClick={onAddConnection}
        leftSection={<FiPlus size={20} />}
        radius="md"
        mt="lg"
        fullWidth={false}
        style={{ width: 220 }}
      >
        Connect to Database
      </Button>

      <Stack spacing="md" mt="xl">
        <Group spacing="xs">
          <ThemeIcon size="md" variant="light" color="blue">
            <FiZap size={16} />
          </ThemeIcon>
          <Text fw={500}>Fast and responsive database management</Text>
        </Group>
        
        <Group spacing="xs">
          <ThemeIcon size="md" variant="light" color="teal">
            <FiGrid size={16} />
          </ThemeIcon>
          <Text fw={500}>Query editor with syntax highlighting</Text>
        </Group>
        
        <Group spacing="xs">
          <ThemeIcon size="md" variant="light" color="violet">
            <FiDatabase size={16} />
          </ThemeIcon>
          <Text fw={500}>Connect to multiple database types</Text>
        </Group>
      </Stack>
    </Stack>
  );
}
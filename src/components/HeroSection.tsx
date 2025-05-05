import { Text, Title, Stack, Group, ThemeIcon, Box, Container } from '@mantine/core';
import { FiDatabase, FiGrid, FiZap, FiRefreshCw } from 'react-icons/fi';

interface HeroSectionProps {
  onAddConnection: () => void;
}

export default function HeroSection({ onAddConnection }: HeroSectionProps) {
  return (
    <Stack spacing="xl" p="xl" justify="center" h="100%" align="center">
      <Title order={1} size="h1" ta="center">
        <Group spacing="md" align="center">
          <ThemeIcon size={56} radius="md" variant="light" color="blue">
            <FiDatabase size={34} />
          </ThemeIcon>
          ZenTable
        </Group>
      </Title>

      <Text size="xl" c="dimmed" maw={540} ta="center" mt="sm">
        Free and open-source database management tool
      </Text>

      <Container size="md" mt={40}>
        <Stack spacing={24}>
          <Group spacing="md">
            <ThemeIcon size="lg" variant="light" color="blue" radius="xl">
              <FiZap size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600} fz="lg">Fast and responsive database management</Text>
              {/* <Text c="dimmed" size="sm">Interact with your databases seamlessly with a native desktop experience</Text> */}
            </Box>
          </Group>
          
          <Group spacing="md">
            <ThemeIcon size="lg" variant="light" color="teal" radius="xl">
              <FiGrid size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600} fz="lg">Query editor with syntax highlighting</Text>
              {/* <Text c="dimmed" size="sm">Execute complex queries with ease using our intelligent editor</Text> */}
            </Box>
          </Group>
          
          <Group spacing="md">
            <ThemeIcon size="lg" variant="light" color="violet" radius="xl">
              <FiRefreshCw size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600} fz="lg">Connect to multiple database types</Text>
              {/* <Text c="dimmed" size="sm">Support for SQLite, MongoDB, and PostgreSQL in a single tool</Text> */}
            </Box>
          </Group>
        </Stack>
      </Container>
    </Stack>
  );
}
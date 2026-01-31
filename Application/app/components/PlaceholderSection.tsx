import { Paper, Stack, Title, Table, Group, Button, Text, Tooltip } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface PlaceholderItem {
  value: string;
  label: string;
}

interface PlaceholderSectionProps {
  title: string;
  items: PlaceholderItem[];
}

export default function PlaceholderSection({ title, items }: PlaceholderSectionProps) {
  return (
    <Paper p="md" withBorder style={{ opacity: 0.6, pointerEvents: "none" }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          <Tooltip label="Feature in development">
            <Button leftSection={<IconPlus size={16} />} disabled style={{ pointerEvents: "auto" }}>
              Add
            </Button>
          </Tooltip>
        </Group>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Value</Table.Th>
              <Table.Th>Label</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.value}>
                <Table.Td>
                  <Text size="sm">{item.value}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.label}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}

import {
  Paper,
  Stack,
  Title,
  Table,
  LoadingOverlay,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Pagination,
  Center,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

export interface Organization {
  gid: number;
  name: string;
  member_count?: number;
  event_count?: number;
}

interface OrganizationsTableProps {
  organizations: Organization[];
  loading?: boolean;
  onRowClick?: (org: Organization) => void;
  onDelete?: (org: Organization) => void;
  showTitle?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function OrganizationsTable({
  organizations,
  loading = false,
  onRowClick,
  onDelete,
  showTitle = true,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: OrganizationsTableProps) {
  return (
    <Paper p="md" withBorder style={{ position: "relative", minHeight: "400px" }}>
      <LoadingOverlay visible={loading} />
      <Stack gap="md">
        {showTitle && <Title order={4}>Organizations ({organizations.length})</Title>}

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Members</Table.Th>
              <Table.Th>Events</Table.Th>
              <Table.Th style={{ width: "50px" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {organizations.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                  <Text c="dimmed" py="xl">
                    No organizations found. Add one to get started.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              organizations.map((org) => (
                <Table.Tr
                  key={org.gid}
                  onClick={() => onRowClick?.(org)}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {org.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm" color="blue">
                      {org.member_count ?? 0}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm" color="green">
                      {org.event_count ?? 0}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Delete organization">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(org);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        {totalPages > 1 && onPageChange && (
          <Center mt="md">
            <Pagination value={currentPage} onChange={onPageChange} total={totalPages} />
          </Center>
        )}
      </Stack>
    </Paper>
  );
}

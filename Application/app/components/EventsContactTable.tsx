import { JSX } from "react"
import { Contact } from "./ContactTable";
import { Text, Badge, Center, Checkbox, Group, LoadingOverlay, Pagination, Paper, Stack, Table, Title } from "@mantine/core";

export interface EventsContactTableProps {
  eventParticipations: EventParticipation[]
  loading: boolean
  onRowClick: (contact: Contact) => void
  showTitle?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  isSelectable?: boolean;
  selectedIds?: Set<number>;
  toggleSelect?: (id: number) => void;
}

export interface EventParticipation {
  contact: Contact,
  created_at: string,
  modified_at: string,
  id: number
  status: string
  status_display: string
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'UNKNOWN': return 'gray';
    case 'MAYBE': return 'gray';
    case 'COMMITTED': return 'blue';
    case 'REJECTED': return 'red';
    case 'ATTENDED': return 'green';
    case 'NO_SHOW': return 'red';
    default: return 'DimGray';
  }
};

export default function EventsContactTable({
  eventParticipations,
  loading = false,
  onRowClick,
  showTitle = true,
  currentPage = 1,
  totalPages = 1,
  isSelectable = true,
  selectedIds,
  toggleSelect,
  onPageChange
}: EventsContactTableProps) {
  const formatContactInfo = (email: string | null, phone: string | null) => {
    const parts = [];
    if (email) parts.push(email);
    if (phone) parts.push(phone);
    return parts.length > 0 ? parts.join(' • ') : 'No contact info';
  };

  const allOnPageSelected =
    isSelectable &&
    eventParticipations.length > 0 &&
    eventParticipations.every(c => selectedIds?.has(c.contact.id));

  const someOnPageSelected =
    isSelectable &&
    eventParticipations.some(c => selectedIds?.has(c.contact.id));

  const toggleSelectAllOnPage = () => {
    if (!toggleSelect || !selectedIds) return;

    if (allOnPageSelected) {
    // DESELECT all rows on this page
    eventParticipations.forEach(c => {
      if (selectedIds.has(c.id)) {
        toggleSelect(c.id);
      }
    });
    } else {
    // SELECT all rows on this page
    eventParticipations.forEach(c => {
      if (!selectedIds.has(c.id)) {
        toggleSelect(c.id);
      }
    });
    }
  };

  return (
    <Paper p="md" withBorder style={{ position: 'relative', minHeight: '400px' }}>
      <LoadingOverlay visible={loading} />
      <Stack gap="md">
        {showTitle && <Title order={4}>Participants ({eventParticipations.length})</Title>}
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {isSelectable && (
                <Table.Th w={40}>
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected && !allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                  />
                </Table.Th>
              )}
              <Table.Th>Name</Table.Th>
              <Table.Th>Contact</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {eventParticipations.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                  <Text c="dimmed" py="xl">No contacts found.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              eventParticipations.map((eventParticipation) => {
                const selected = selectedIds?.has(eventParticipation.id);

                return (
                  <Table.Tr
                    key={eventParticipation.contact.discord_id}
                    bg={selected ? 'var(--mantine-color-blue-light)' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (isSelectable && toggleSelect && selectedIds?.size) {
                        // If anything is selected, row click toggles selection
                        toggleSelect(eventParticipation.id);
                      } else {
                        // Otherwise, normal row click behavior
                        onRowClick?.(eventParticipation.contact);
                      }
                    }}
                  >
                    {isSelectable && (
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleSelect!(eventParticipation.id)}
                        />
                      </Table.Td>
                    )}

                    <Table.Td>{eventParticipation.contact.full_name}</Table.Td>

                    <Table.Td>
                      <Text size="sm">
                        {formatContactInfo(eventParticipation.contact.email, eventParticipation.contact.phone)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        <Badge color={getStatusColor(eventParticipation.status)}>{eventParticipation.status_display}</Badge>
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
        {totalPages > 1 && onPageChange && (
          <Center mt="md">
            <Pagination
              value={currentPage}
              onChange={onPageChange}
              total={totalPages}
            />
          </Center>
        )}
      </Stack>
    </Paper>
  );
}

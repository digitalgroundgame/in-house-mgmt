'use client';

import { Table, Badge, Stack, Title, LoadingOverlay, Paper } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { Ticket } from './ticket-utils';

interface TicketTableProps {
  tickets: Ticket[];
  loading?: boolean;
  showTitle?: boolean;
}

export const getPriorityColor = (priority: number) => {
  if (priority < 1) return 'red';
  if (priority < 3) return 'orange';
  if (priority == 3) return 'yellow';
  if (priority <= 5) return 'gray';
  return 'gray';
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return 'gray';
    case 'TODO': return 'gray';
    case 'IN_PROGRESS': return 'blue';
    case 'BLOCKED': return 'red';
    case 'COMPLETED': return 'DimGray';
    case 'CANCELED': return 'red';
    default: return 'DimGray';
  }
};

export default function TicketTable({
  tickets: tickets,
  loading = false,
  showTitle = true
}: TicketTableProps) {
  const router = useRouter()

  return (
    <Paper p="md" withBorder style={{ position: 'relative', minHeight: '400px' }}>
      <LoadingOverlay visible={loading} />
      <Stack gap="md">
        {showTitle && <Title order={4}>Available Tickets</Title>}
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Assigned</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tickets.map((ticket) => (
              <Table.Tr
                key={ticket.id}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>{ticket.id}</Table.Td>
                <Table.Td>{ticket.title}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{ticket.type_display}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={getPriorityColor(ticket.priority)}>
                    P{ticket.priority}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(ticket.ticket_status)}>
                    {ticket.status_display}
                  </Badge>
                </Table.Td>
                <Table.Td>{ticket.contact || 'Unassigned'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}
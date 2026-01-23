'use client';

import {
  Container,
  Title,
  Grid,
  Paper,
  Group,
  Badge,
  Select,
  Stack,
  Text,
  Button,
  Timeline,
  Divider,
  Box,
  ActionIcon
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import TicketTable, { type SortField, type SortDirection } from '@/app/components/TicketTable';
import ContactSearch from '@/app/components/ContactSearch';
import { type Ticket } from '@/app/components/ticket-utils';

// TODO: /tickets/123 doesn't work, we should make sure the url reflects the current ticket
export default function TicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState<string | null>(null);
  const [assignee, setAssignee] = useState('admin');
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'OPEN', label: 'Open' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'BLOCKED', label: 'Blocked' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELED', label: 'Canceled' },
  ];

  useEffect(() => {
    fetchTicketes();
  }, []);

  const handleReset = () => {
    setPriority(null);
    setStatus('all');
    setSortField(null);
    setSortDirection(null);
    fetchTicketes(undefined, null, 'all', null, null);
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    fetchTicketes(undefined, priority, status, field, direction);
  };

  const fetchTicketes = async (
    url?: string,
    priorityFilter?: string | null,
    statusFilter?: string,
    orderField?: SortField,
    orderDirection?: SortDirection
  ) => {
    try {
      setLoading(true);
      let fetchUrl = url || '/api/tickets';

      // Add filters if not using pagination URL
      if (!url) {
        const params = new URLSearchParams();
        if (priorityFilter !== undefined && priorityFilter !== null) {
          params.append('priority', priorityFilter);
        }
        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (orderField && orderDirection) {
          const orderValue = orderDirection === 'desc' ? `-${orderField}` : orderField;
          params.append('ordering', orderValue);
        }
        if (params.toString()) {
          fetchUrl = `/api/tickets?${params.toString()}`;
        }
      }

      const response = await fetch(fetchUrl);
      console.log('Fetch response:', response);
      const data = await response.json();
      console.log('Fetched tickets data:', data);
      setTickets(data.results || []);
      setTotalCount(data.count);
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (reach: Ticket) => {
    setSelectedTicket(reach);
  };

  const handleBackToTable = () => {
    setSelectedTicket(null);
  };


  // TODO: Use code in TicketesTable.tsx
  const getPriorityColor = (priority: number) => {
    if (priority < 1) return 'red';
    if (priority < 3) return 'orange';
    if (priority == 3) return 'yellow';
    if (priority <= 5) return 'gray';
    return 'gray';
  };

  // TODO: Use code in TicketesTable.tsx
  const getStatusColor = (status: string) => {
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

  return (
    <Container size="xl" py="xl">
      <Grid>
        {/* Main Content Area */}
        <Grid.Col span={{ base: 12, md: selectedTicket ? 8 : 12 }}>
          <Stack gap="md">
            {/* Header */}
            <Group justify="space-between">
              <Title order={2}>
                {selectedTicket ? selectedTicket.title : 'Ticket Queue Management'}
              </Title>
              {selectedTicket && (
                <Button variant="outline" onClick={handleBackToTable}>
                  Back to List
                </Button>
              )}
            </Group>

            {/* Status Filters */}
            {!selectedTicket && (
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Group gap="xs">
                    {statuses.map((s) => (
                      <Badge
                        key={s.value}
                        variant={status === s.value ? 'filled' : 'light'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setStatus(s.value);
                          fetchTicketes(undefined, priority, s.value, sortField, sortDirection);
                        }}
                      >
                        {s.label}
                      </Badge>
                    ))}
                  </Group>

                  <Group gap="md">
                    <Select
                      label="Priority"
                      value={priority}
                      onChange={(value) => setPriority(value)}
                      placeholder="All priorities"
                      clearable
                      data={[
                        { value: '0', label: 'P0 - Emergency' },
                        { value: '1', label: 'P1 - Very High' },
                        { value: '2', label: 'P2 - High' },
                        { value: '3', label: 'P3 - Normal' },
                        { value: '4', label: 'P4 - Low' },
                        { value: '5', label: 'P5 - Very Low' },
                      ]}
                      style={{ flex: 1 }}
                    />
                    <Select
                      label="Assignee"
                      value={assignee}
                      onChange={(value) => setAssignee(value || 'admin')}
                      data={[
                        { value: 'admin', label: 'admin (admin@test.com)' },
                        { value: 'user1', label: 'User 1 (user1@test.com)' },
                        { value: 'user2', label: 'User 2 (user2@test.com)' },
                      ]}
                      style={{ flex: 1 }}
                    />
                    <Button mt="xl" onClick={() => fetchTicketes(undefined, priority, status, sortField, sortDirection)}>Update</Button>
                  </Group>
                <Group gap="sm">
                  <Button variant="outline" onClick={handleReset}>Reset</Button>
                </Group>
                </Stack>
              </Paper>
            )}

            {/* Tickets Table or Call Instructions */}
              <>
                <TicketTable
                  tickets={tickets}
                  loading={loading}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />

                {/* Pagination and count */}
                <Paper p="sm" withBorder>
                  <Group justify="space-between">
                    <span>{totalCount} {totalCount === 1 ? 'ticket' : 'tickets'} found</span>
                    <Group gap="xs">
                      <ActionIcon
                        variant="filled"
                        disabled={!previousUrl}
                        onClick={() => previousUrl && fetchTicketes(previousUrl)}
                        aria-label="Previous page"
                      >
                        <IconChevronLeft size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="filled"
                        disabled={!nextUrl}
                        onClick={() => nextUrl && fetchTicketes(nextUrl)}
                        aria-label="Next page"
                      >
                        <IconChevronRight size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              </>
            {/* Activity Section - Only show when reach is selected */}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

'use client'
import Link from 'next/link';

import { useState, useEffect } from "react"
import { Grid, Stack, Group, Title, Button, Paper, Box, Badge, Divider, Text, Timeline, Container } from "@mantine/core"
import { useRouter } from "next/navigation"
import { getStatusColor, getPriorityColor } from "./TicketTable"
import TicketDescription from "./TicketDescription";
import { Ticket } from "./ticket-utils"
import ContactSearch from "./ContactSearch"
import getCookie from '@/app/utils/cookie';


export default function TicketView({ticket} : { ticket: Ticket}) {
  return <Container size="xl" py="xl">
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="md">
          <TitleCard ticket={ticket}/>
          {/* Status Info */}
          <TicketDescription description={ticket.description}/>
          <ActivityCard />

        </Stack>
      </Grid.Col>
      <Grid.Col span={{base: 12, md: 4}}>
        <Stack gap='md'>
          <TicketMetadataCard ticket={ticket}/>
          {/* Show call instructions for selected reach */}
          <Actions ticketId={ticket.id} />

        </Stack>
      </Grid.Col>
    </Grid>
  </Container>
}

function TitleCard({ticket}: {ticket: Ticket}) {
  const router = useRouter()
  return <Group justify="space-between">
    <Title order={2}>
      {ticket.title}
    </Title>
    <Button variant="outline" onClick={() => router.back()}>
      Back to List
    </Button>
  </Group>
}

function CallInstructionsCard({ticket}: {ticket: Ticket}) {
  return <Paper p="md" withBorder style={{ position: 'relative', minHeight: '400px' }}>
    <Stack gap="md">
      <Title order={4}>Call Instructions</Title>

      <Box>
        <Text size="sm" c="dimmed" mb="xs">Description</Text>
        <Paper p="md" bg="gray.0" style={{ borderRadius: '4px' }}>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {ticket.description}
          </Text>
        </Paper>
      </Box>

      <ol style={{ paddingLeft: '1.5rem' }}>
        <li>Review the reach details and requirements</li>
        <li>Contact the assigned person or team</li>
        <li>Discuss the reach objectives and timeline</li>
        <li>Update the reach status based on the outcome</li>
        <li>Mark follow-up actions if needed</li>
      </ol>


    </Stack>
  </Paper>
}

function TicketMetadataCard({ ticket }: { ticket: Ticket }) {
  const [loading, setLoading] = useState(false);
  const isClaimed = Boolean(ticket.assigned_to);

  const handleClaimToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/claim`, {
        credentials: "include",
        method: isClaimed ? 'DELETE' : 'POST',
        headers: {
          "X-CSRFToken": getCookie('csrftoken')!,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update claim status');
      }

      // simplest option: reload page data
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket claim status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">

        <Button
          fullWidth
          loading={loading}
          color={isClaimed ? 'gray' : 'blue'}
          variant={isClaimed ? 'outline' : 'filled'}
          onClick={handleClaimToggle}
        >
          {isClaimed ? 'Unclaim Ticket' : 'Claim Ticket'}
        </Button>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Status</Text>
          <Badge variant="filled" color={getStatusColor(ticket.ticket_status)} mt={4}>
            {ticket.status_display}
          </Badge>
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Priority</Text>
          <Badge variant="light" color={getPriorityColor(ticket.priority)} mt={4}>
            {ticket.priority_display}
          </Badge>
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Claimed By</Text>
          {ticket.assigned_to_username ? (
            <Text size="sm" mt={4}>{ticket.assigned_to_username}</Text>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>None</Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Reported By</Text>
          {ticket.reported_by_username ? (
            <Text size="sm" mt={4}>{ticket.reported_by_username}</Text>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>None</Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Type</Text>
          <Text size="sm" mt={4}>{ticket.type_display}</Text>
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Contact</Text>
          {ticket.contact ? (
            <Link href={`/contacts/${ticket.contact}`}>
              <Text size="sm" mt={4}>{ticket.contact_display}</Text>
            </Link>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>None</Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">Event</Text>
          {ticket.event ? (
            <Link href={`/events/${ticket.event}`}>
              <Text size="sm" mt={4}>{ticket.event_display}</Text>
            </Link>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>None</Text>
          )}
        </Box>

      </Stack>
    </Paper>
  );
}


function ActivityCard() {
  return <Paper p="md" withBorder>
    <Title order={4} mb="md">Activity (Dummy)</Title>
    <Timeline active={2} bulletSize={24} lineWidth={2}>
      <Timeline.Item title="Ticket updated">
        <Text c="dimmed" size="sm">admin (admin@test.com)</Text>
        <Text size="xs" mt={4}>Dec 31, 16:29</Text>
      </Timeline.Item>
      <Timeline.Item title="Status updated to In Progress">
        <Text c="dimmed" size="sm">admin (admin@test.com)</Text>
        <Text size="xs" mt={4}>Dec 31, 16:27</Text>
      </Timeline.Item>
      <Timeline.Item title="Ticket assigned">
        <Text c="dimmed" size="sm">System</Text>
        <Text size="xs" mt={4}>Dec 31, 16:05</Text>
      </Timeline.Item>
    </Timeline>
  </Paper>
}

function Actions({ ticketId }: { ticketId: number }) {
  const [askStatuses, setAskStatuses] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    fetch(`/api/tickets/get_ask_statuses/`)
      .then(res => res.json())
      .then(data => setAskStatuses(data))
      .catch(console.error)
    console.log(askStatuses)
  }, [])

  const handleAction = (status: string) => {
    // TODO: Implement API call to record ask status for ticket
    console.log(`Recording ask status: ${status} for ticket ${ticketId}`)
  }

  return <Paper p="md" withBorder>
    <Title order={5} mb="md">Actions</Title>
    <Stack gap="xs">
      {askStatuses
        .filter(s => s.value !== 'UNKNOWN')
        .map(status => (
          <Button
            key={status.value}
            fullWidth
            variant="light"
            color="gray"
            onClick={() => handleAction(status.value)}
          >
            {status.label}
          </Button>
        ))}
    </Stack>
  </Paper>
}
'use client'
import Link from 'next/link';

import { useState, useEffect } from "react"
import { Grid, Stack, Group, Title, Button, Paper, Box, Badge, Divider, Text, Timeline, Container, SegmentedControl, Loader, Center } from "@mantine/core"
import { useRouter } from "next/navigation"
import { getStatusColor, getPriorityColor } from "./TicketTable"
import TicketDescription from "./TicketDescription";
import { Ticket } from "./ticket-utils"

type TimelineShowType = "both" | "request" | "audit";

interface TimelineEntry {
  type: "audit" | "comment";
  created_at: string;
  actor_display: string | null;
  actor_id: number | null;
  changes?: Record<string, [string, string]>;
  message?: string;
}
import ContactSearch from "./ContactSearch"
import getCookie from '@/app/utils/cookie';


interface TicketViewProps {
  ticket: Ticket;
  timeline: TimelineEntry[];
  timelineLoading: boolean;
  showType: TimelineShowType;
  onShowTypeChange: (value: TimelineShowType) => void;
}

export default function TicketView({ ticket, timeline, timelineLoading, showType, onShowTypeChange }: TicketViewProps) {
  return <Container size="xl" py="xl">
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="md">
          <TitleCard ticket={ticket}/>
          {/* Status Info */}
          <TicketDescription description={ticket.description}/>
          <TicketTimeline
            timeline={timeline}
            loading={timelineLoading}
            showType={showType}
            onShowTypeChange={onShowTypeChange}
          />

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


interface TicketTimelineProps {
  timeline: TimelineEntry[];
  loading: boolean;
  showType: TimelineShowType;
  onShowTypeChange: (value: TimelineShowType) => void;
}

function ResolvedName({ field, id }: { field: string; id: string }) {
  const [name, setName] = useState<string>(id);

  useEffect(() => {
    if (!id || id === 'None') {
      setName('None');
      return;
    }

    let endpoint: string;
    if (field === 'contact') {
      endpoint = `/api/contacts/${id}`;
    } else if (field === 'event') {
      endpoint = `/api/events/${id}`;
    } else if (field === 'user') {
      endpoint = `/api/users/${id}/`;
    } else {
      return;
    }

    fetch(endpoint, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (field === 'contact') setName(data.full_name);
          else if (field === 'event') setName(data.name);
          else if (field === 'user') setName(data.username);
        }
      })
      .catch(() => setName(id));
  }, [field, id]);

  return <>{name}</>;
}

function TicketTimeline({ timeline, loading, showType, onShowTypeChange }: TicketTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEntryTitle = (entry: TimelineEntry) => {
    if (entry.type === "audit") {
      return "Ticket updated";
    }
    return "Comment added";
  };

  const renderChangeValue = (field: string, value: string) => {
    if ((field === 'contact' || field === 'event') && value && value !== 'None') {
      return <ResolvedName field={field} id={value} />;
    }
    return value || 'None';
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>Activity</Title>
        <SegmentedControl
          size="xs"
          value={showType}
          onChange={(value) => onShowTypeChange(value as TimelineShowType)}
          data={[
            { label: 'All', value: 'both' },
            { label: 'Comments', value: 'comment' },
            { label: 'Audit', value: 'audit' },
          ]}
        />
      </Group>
      {loading ? (
        <Center h={100}>
          <Loader size="sm" />
        </Center>
      ) : timeline.length === 0 ? (
        <Text c="dimmed" size="sm">No activity yet</Text>
      ) : (
        <Timeline active={timeline.length - 1} bulletSize={24} lineWidth={2}>
          {timeline.map((entry, index) => (
            <Timeline.Item key={index} title={getEntryTitle(entry)}>
              {entry.type === "comment" && entry.message && (
                <Text size="sm" mb={4}>{entry.message}</Text>
              )}
              {entry.type === "audit" && entry.changes && typeof entry.changes === 'object' && (
                <Stack gap={2} mb={4}>
                  {Object.entries(entry.changes).map(([field, [oldVal, newVal]]) => (
                    <Text key={field} size="sm" c="dimmed">
                      <Text span fw={500}>{field}:</Text> {renderChangeValue(field, oldVal)} → {renderChangeValue(field, newVal)}
                    </Text>
                  ))}
                </Stack>
              )}
              <Text c="dimmed" size="sm">{entry.actor_display ?? 'System'}</Text>
              <Text size="xs" mt={4}>{formatDate(entry.created_at)}</Text>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Paper>
  );
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
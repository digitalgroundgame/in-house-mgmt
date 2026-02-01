import { Contact } from "@/app/components/ContactSearch";
import EventsContactTable, { EventParticipation } from "@/app/components/EventsContactTable";
import { Event, getStatusColor } from "@/app/components/event-utils";
import { BackendPaginatedResults, useBackend } from "@/app/lib/api";
import { Text, Paper, Container, Stack, Divider, Title, Grid, GridCol, Box, Badge, LoadingOverlay } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function EventView({event}: {event: Event | undefined}) {
  return <Container py="xl" size="xl">
    <LoadingOverlay visible={!event} />
    {event && <EventViewMain event={event} />}
  </Container>
}

function EventViewMain({event}: {event: Event}) {
    return <Grid>
      <GridCol span={{ base: 12, md: 8 }}>
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Title>{event.name}</Title>
            <Divider />
            <Text>{event.description}</Text>
          </Stack>
        </Paper> 
        <EventViewContactTable event={event} />
      </GridCol>
      <EventViewMetadata event={event} />
    </Grid>
}

function EventViewMetadata({event}: {event: Event}) {
  return <GridCol span={{ base: 12, md: 4 }}>
    <Paper withBorder p="sm">
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">Event Status</Text>
        <Badge color={getStatusColor(event.status_display)}>{event.status_display}</Badge>
      </Box>
      <Divider />
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">Location Name</Text>
        <Text>{event.location_name}</Text>
      </Box>
      <Divider />
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">Address</Text>
        <Text mb={4}>{event.location_address}</Text>
      </Box>
      <Divider />
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">Location Display</Text>
        <Text>{event.location_display}</Text>
      </Box>
      <Divider />
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">Start Date</Text>
        <Text>{event.starts_at}</Text>
      </Box>
      <Divider />
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">End Date</Text>
        <Text>{event.ends_at}</Text>
      </Box>
    </Paper>
  </GridCol>
}

function EventViewContactTable({event}: {event: Event}) {
  const {data, loading, error} = useBackend<BackendPaginatedResults<EventParticipation>>(`/api/participants?event=${event.id}`)
  const router = useRouter()

  console.log(data)
  return <>
    <LoadingOverlay visible={!data}/>
    {data && <EventsContactTable 
        eventParticipations={data.results}
        loading={loading}
        onRowClick={(contact: Contact) => router.push(`/contacts/${contact.id}`)}
    />}
  </>
}

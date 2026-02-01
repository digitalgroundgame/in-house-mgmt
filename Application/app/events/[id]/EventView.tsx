import { Contact } from "@/app/components/ContactSearch";
import EventsContactTable, { EventParticipation } from "@/app/components/EventsContactTable";
import PaginatedTable, { rowSelectionStateChange } from "@/app/components/PaginatedTable";
import { formatContactInfo } from "@/app/components/contact-utils";
import { Event } from "@/app/components/event-utils";
import { BackendPaginatedResults, useBackend } from "@/app/lib/api";
import { Text, Paper, Container, Stack, Divider, Title, Grid, GridCol, Box, Badge, LoadingOverlay, Table } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

const getStatusColor = (status: string) => {
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

function EventViewContactTable({event}: {event: Event}) {
  const {data, loading, error} = useBackend<BackendPaginatedResults<EventParticipation>>(`/api/participants?event=${event.id}`)
  const [selected, setSelected] = useState<Set<number>>(new Set()) 
  const router = useRouter()

  console.log(selected)
  return <>
    <LoadingOverlay visible={!data}/>

     {data && <EventsContactTable 
        eventParticipations={data.results}
        loading={loading}
        onRowClick={(contact: Contact) => router.push(`/contacts/${contact.id}`)}
    />}
    {data && <PaginatedTable 
      data={data.results}
      onRowClick={(contact: EventParticipation) => router.push(`/contacts/${contact.id}`)}
      columns={["Name", "Contact", "Status"]} 
      transforms={[
        (ep) => <Table.Td key={ep.contact.full_name}>{ep.contact.full_name}</Table.Td>,
        (ep) => <Table.Td key={ep.contact.phone}>{formatContactInfo(ep.contact.full_name, ep.contact.phone)}</Table.Td>,
        (ep) => <Table.Td key={ep.status}>
          <Badge color={getStatusColor(ep.status)}>{ep.status_display}</Badge>
        </Table.Td>
      ]}
      useCheckboxes={true}
      onSelect={(ele) => setSelected(prev => rowSelectionStateChange(prev, ele.id))}
      selected={selected}
      keyFn={(ep: EventParticipation) => ep.id}
     />}
  </>
}

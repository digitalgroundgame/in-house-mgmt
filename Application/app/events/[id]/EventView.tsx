import { Contact } from "@/app/components/ContactSearch";
import PaginatedTable from "@/app/components/pagination/PaginatedTable";
import PaginationBar, {
  decrementPageSearchParam,
  incrementPageSearchParam,
} from "@/app/components/pagination/PaginationBar";
import { formatContactInfo } from "@/app/components/contact-utils";
import {
  Event,
  EventParticipation,
  getEventParticipationStatusColor,
} from "@/app/components/event-utils";
import { BackendPaginatedResults, useBackend, useBackendMutation } from "@/app/lib/api";
import {
  Text,
  Paper,
  Container,
  Stack,
  Divider,
  Title,
  Grid,
  GridCol,
  Box,
  Badge,
  LoadingOverlay,
  Table,
  TextInput,
  Group,
  MultiSelect,
  Button,
  Modal,
  Select,
  Combobox,
  useCombobox,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import getCookie from "@/app/utils/cookie";

const EVENT_PARTICIPATION_STATUSES = [
  "UNKNOWN",
  "MAYBE",
  "COMMITED",
  "REJECTED",
  "ATTENDED",
  "NO_SHOW",
] as const;
type EventParticipationStatus = (typeof EVENT_PARTICIPATION_STATUSES)[number];

export default function EventView({ event }: { event: Event | undefined }) {
  return (
    <Container py="xl" size="xl">
      <LoadingOverlay visible={!event} />
      {event && <EventViewMain event={event} />}
    </Container>
  );
}

function EventViewMain({ event }: { event: Event }) {
  return (
    <Grid>
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
  );
}

function EventViewMetadata({ event }: { event: Event }) {
  return (
    <GridCol span={{ base: 12, md: 4 }}>
      <Paper withBorder p="sm">
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Event Status
          </Text>
          <Badge color={getEventParticipationStatusColor(event.status_display)}>
            {event.status_display}
          </Badge>
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Location Name
          </Text>
          <Text>{event.location_name}</Text>
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Address
          </Text>
          <Text mb={4}>{event.location_address}</Text>
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Location Display
          </Text>
          <Text>{event.location_display}</Text>
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Start Date
          </Text>
          <Text>{event.starts_at}</Text>
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            End Date
          </Text>
          <Text>{event.ends_at}</Text>
        </Box>
      </Paper>
    </GridCol>
  );
}

function AddParticipantModal({
  selected,
  opened,
  close,
  refresh,
}: {
  selected?: EventParticipation[];
  opened: boolean;
  close: () => void;
  refresh: () => void;
}) {
  const [contactSearchQuery, setContactSearchQuery] = useState<string>();
  const [selectedContacts, setSelectedContacts] = useState<Set<Contact>>(
    new Set(selected?.map((ep) => ep.contact))
  );
  const [eventStatus, setEventStatus] = useState<EventParticipationStatus>();
  const eventId = usePathname().split("/").pop();
  const apiParams = new URLSearchParams();
  if (contactSearchQuery) apiParams.append("search", contactSearchQuery);

  const contactsSearch = useBackend<BackendPaginatedResults<Contact>>(
    `/api/contacts/?${apiParams}`
  );
  const { mutate, loading, error } = useBackendMutation(`/api/participants`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
    },
  });
  const selectedContactIds: number[] = [];
  selectedContacts.forEach((c) => selectedContactIds.push(c.id));
  const contacts = contactsSearch.data?.results.filter((c) => !selectedContactIds.includes(c.id));
  const combobox = useCombobox();
  const removeContact = (c: Contact) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      next.delete(c);
      return next;
    });
  };

  return (
    <Modal opened={opened} onClose={close} title="Add Participant">
      <LoadingOverlay visible={loading} />
      <Stack>
        <Combobox
          store={combobox}
          onOptionSubmit={(value) => {
            const contact = contacts?.find((c) => c.id.toString() === value);
            if (!contact) return;

            setSelectedContacts((prev) => {
              const next = new Set(prev);
              next.add(contact);
              return next;
            });
            setContactSearchQuery("");
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <TextInput
              label="Contact"
              placeholder="Search contacts..."
              value={contactSearchQuery}
              onChange={(event) => {
                setContactSearchQuery(event.currentTarget.value);
                combobox.openDropdown();
              }}
              onFocus={() => combobox.openDropdown()}
              onClick={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
            />
          </Combobox.Target>

          <Combobox.Dropdown hidden={contacts === undefined || contacts.length === 0}>
            <Combobox.Options>
              {contacts?.map((contact) => (
                <Combobox.Option key={contact.id} value={contact.id.toString()}>
                  {contact.full_name}
                </Combobox.Option>
              ))}

              {contacts?.length === 0 && <Combobox.Empty>No contacts found</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <Select
          label="Participation Status"
          placeholder="Participation Status"
          data={EVENT_PARTICIPATION_STATUSES}
          onChange={(s, _) => setEventStatus(s as EventParticipationStatus)}
          value={eventStatus}
        />
        <PaginatedTable
          columns={["Full Name", "Discord ID"]}
          data={Array.from(selectedContacts)}
          transforms={[
            (c: Contact) => <Table.Td>{c.full_name}</Table.Td>,
            (c: Contact) => <Table.Td>{c.discord_id}</Table.Td>,
            (c: Contact) => (
              <Table.Td>
                <Button color="red" onClick={() => removeContact(c)}>
                  Remove
                </Button>
              </Table.Td>
            ),
          ]}
          loading={false}
          noDataText="Select a participant to proceed"
        />
        <Button
          onClick={async () => {
            await Promise.all(
              Array.from(selectedContacts).map((c) =>
                mutate({
                  event_id: Number.parseInt(eventId!),
                  status: eventStatus,
                  contact_id: c.id,
                })
              )
            );
            if (!error) {
              setSelectedContacts(new Set());
              close();
              refresh();
            }
          }}
        >
          Submit
        </Button>
      </Stack>
    </Modal>
  );
}

function EventViewContactTable({ event }: { event: Event }) {
  const currentParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>();
  const [statusArray, setStatusArray] = useState<string[]>();
  const [opened, { open, close }] = useDisclosure(false);

  const pageNum = currentParams.get("page");
  const apiParams = new URLSearchParams();

  if (pageNum) apiParams.append("page", pageNum);
  if (searchQuery) apiParams.append("search", searchQuery);
  if (statusArray) {
    for (const status of statusArray) {
      apiParams.append("status", status);
    }
  }

  apiParams.append("event", event.id.toString());

  const { data, loading, error } = useBackend<BackendPaginatedResults<EventParticipation>>(
    `/api/participants/?${apiParams}`
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const selectedData = data?.results.filter((participation) => selected.has(participation.id));
  return (
    <>
      {opened && (
        <AddParticipantModal
          selected={selectedData}
          opened={opened}
          close={close}
          refresh={refresh}
        />
      )}
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group grow align="flex-end">
            <TextInput
              label="Search"
              placeholder="Search by name, Discord ID, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <MultiSelect
              label="Participation Status"
              data={EVENT_PARTICIPATION_STATUSES}
              onChange={setStatusArray}
              value={statusArray}
            />
            {selected.size === 0 ? (
              <Button onClick={open}>Add Participant</Button>
            ) : (
              <Button color="green" onClick={open}>
                Modify Selected
              </Button>
            )}
          </Group>
          {data && (
            <PaginatedTable
              title="Participants"
              showTitle={true}
              data={data.results}
              onRowClick={(contact: EventParticipation) => router.push(`/contacts/${contact.id}`)}
              columns={["Name", "Contact", "Status"]}
              transforms={[
                (ep) => <Table.Td key={ep.contact.full_name}>{ep.contact.full_name}</Table.Td>,
                (ep) => (
                  <Table.Td key={ep.contact.phone}>
                    {formatContactInfo(ep.contact.full_name, ep.contact.phone)}
                  </Table.Td>
                ),
                (ep) => (
                  <Table.Td key={ep.status}>
                    <Badge color={getEventParticipationStatusColor(ep.status)}>
                      {ep.status_display}
                    </Badge>
                  </Table.Td>
                ),
              ]}
              loading={loading}
              useCheckboxes={true}
              onSelectionChange={setSelected}
              selected={selected}
              keyFn={(ep: EventParticipation) => ep.id}
            />
          )}
          {data && (
            <PaginationBar
              entityName="Participant(s)"
              totalCount={data?.count}
              previousUrl={data?.previous}
              nextUrl={data.next}
              handleNext={() =>
                data.next && updateParam("page", incrementPageSearchParam(currentParams))
              }
              handlePrevious={() =>
                data.previous && updateParam("page", decrementPageSearchParam(currentParams))
              }
            />
          )}
        </Stack>
      </Paper>
    </>
  );
}

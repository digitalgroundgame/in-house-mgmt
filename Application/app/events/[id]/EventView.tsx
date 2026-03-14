import { Contact } from "@/app/components/ContactSearch";
import PaginatedTable from "@/app/components/pagination/PaginatedTable";
import PaginationBar, {
  decrementPageSearchParam,
  incrementPageSearchParam,
} from "@/app/components/pagination/PaginationBar";
import { formatContactInfo } from "@/app/components/contact-utils";
import { User } from "@/app/components/provider/types";
import {
  Event,
  EventParticipation,
  getEventParticipationStatusColor,
  UsersInEvent,
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
  Tabs,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
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
        <Tabs defaultValue="participants" mt="md">
          <Tabs.List>
            <Tabs.Tab value="participants">Participants</Tabs.Tab>
            <Tabs.Tab value="users">Users</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="participants">
            <EventViewContactTable event={event} />
          </Tabs.Panel>
          <Tabs.Panel value="users">
            <EventViewUsersTable event={event} />
          </Tabs.Panel>
        </Tabs>
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
  const { mutate, loading, error } = useBackendMutation(`/api/participants/`, {
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
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  const {
    data,
    loading,
    error,
    refresh: refetch,
  } = useBackend<BackendPaginatedResults<EventParticipation>>(`/api/participants/?${apiParams}`);
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
          refresh={refetch}
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
              onRowClick={(ep: EventParticipation) => router.push(`/contacts/${ep.contact.id}`)}
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

function EventViewUsersTable({ event }: { event: Event }) {
  const currentParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);

  const pageNum = currentParams.get("page");
  const apiParams = new URLSearchParams();

  if (pageNum) apiParams.append("page", pageNum);
  if (searchQuery) apiParams.append("search", searchQuery);

  apiParams.append("event", event.id.toString());

  const {
    data,
    loading,
    refresh: refetch,
  } = useBackend<BackendPaginatedResults<UsersInEvent>>(`/api/assignments/?${apiParams}`);
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleDelete = async (userId: number) => {
    setDeletingId(userId);
    try {
      const response = await fetch(`/api/assignments/${userId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });
      if (response.ok) {
        refetch();
      } else if (response.status === 403) {
        notifications.show({
          title: "Permission Denied",
          message: "You do not have permission to remove this user from the event.",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to remove user. Please try again.",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to remove user. Please try again.",
        color: "red",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {addModalOpened && (
        <AddUserModal
          event={event}
          opened={addModalOpened}
          close={closeAddModal}
          refresh={refetch}
          currentUsers={data?.results ?? []}
        />
      )}
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group grow align="flex-end">
            <TextInput
              label="Search"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <Button onClick={openAddModal}>Add User</Button>
          </Group>
          {data && (
            <PaginatedTable
              title="Users"
              showTitle={true}
              data={data.results}
              columns={["Username", "Joined At"]}
              selected={new Set()}
              transforms={[
                (user: UsersInEvent) => (
                  <Table.Td key={user.user_username}>{user.user_username}</Table.Td>
                ),
                (user: UsersInEvent) => (
                  <Table.Td key={user.joined_at}>
                    {new Date(user.joined_at).toLocaleString()}
                  </Table.Td>
                ),
                (user: UsersInEvent) => (
                  <Table.Td key={user.id}>
                    <Button
                      color="red"
                      size="xs"
                      loading={deletingId === user.id}
                      onClick={() => handleDelete(user.id)}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                ),
              ]}
              loading={loading}
              keyFn={(user: UsersInEvent) => user.id}
            />
          )}
          {data && (
            <PaginationBar
              entityName="User(s)"
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

function AddUserModal({
  event,
  opened,
  close,
  refresh,
  currentUsers,
}: {
  event: Event;
  opened: boolean;
  close: () => void;
  refresh: () => void;
  currentUsers: UsersInEvent[];
}) {
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<User>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const apiParams = new URLSearchParams();
  if (userSearchQuery) apiParams.append("search", userSearchQuery);

  const usersSearch = useBackend<BackendPaginatedResults<User>>(`/api/users/?${apiParams}`);
  const { mutate: addMutate } = useBackendMutation(`/api/assignments/`, {
    method: "POST",
  });

  const currentUserIds = new Set(currentUsers.map((u) => u.user));

  const availableUsers = usersSearch.data?.results.filter((u) => !currentUserIds.has(u.id)) ?? [];
  const combobox = useCombobox();

  const removeUser = (u: User) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.delete(u);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await Promise.all(
        Array.from(selectedUsers).map((u) =>
          addMutate({
            event: event.id,
            user: u.id,
          })
        )
      );
      setSelectedUsers(new Set());
      close();
      refresh();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("403")) {
        notifications.show({
          title: "Permission Denied",
          message: "You do not have permission to add users to this event.",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to add users. Please try again.",
          color: "red",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Add User">
      <LoadingOverlay visible={submitting} />
      <Stack>
        <Combobox
          store={combobox}
          onOptionSubmit={(value) => {
            const user = availableUsers.find((u) => u.id.toString() === value);
            if (!user) return;

            setSelectedUsers((prev) => {
              const next = new Set(prev);
              next.add(user);
              return next;
            });
            setUserSearchQuery("");
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <TextInput
              label="User"
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={(event) => {
                setUserSearchQuery(event.currentTarget.value);
                combobox.openDropdown();
              }}
              onFocus={() => combobox.openDropdown()}
              onClick={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
              rightSection={usersSearch.loading ? <LoadingOverlay visible /> : null}
            />
          </Combobox.Target>

          <Combobox.Dropdown hidden={availableUsers.length === 0}>
            <Combobox.Options>
              {availableUsers.map((user) => (
                <Combobox.Option key={user.id} value={user.id.toString()}>
                  {user.username}
                </Combobox.Option>
              ))}

              {availableUsers.length === 0 && <Combobox.Empty>No users found</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <PaginatedTable
          columns={["Username", "Email"]}
          data={Array.from(selectedUsers)}
          transforms={[
            (u: User) => <Table.Td key="username">{u.username}</Table.Td>,
            (u: User) => <Table.Td key="email">{u.email}</Table.Td>,
            (u: User) => (
              <Table.Td key="actions">
                <Button color="red" onClick={() => removeUser(u)}>
                  Remove
                </Button>
              </Table.Td>
            ),
          ]}
          loading={false}
          noDataText="Select a user to proceed"
        />
        <Button onClick={handleSubmit} disabled={selectedUsers.size === 0}>
          Submit
        </Button>
      </Stack>
    </Modal>
  );
}

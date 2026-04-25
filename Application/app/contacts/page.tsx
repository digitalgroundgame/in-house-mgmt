"use client";

import {
  ActionIcon,
  Button,
  Container,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";
import { TicketBulkCreateModal } from "@/app/components/tickets/TicketBulkCreateModal";
import ContactTable, { type Contact, type Tag } from "@/app/components/ContactTable";
import "./page.css";

const MAX_TAG_COUNT = 99999;

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bulkTicketModalOpen, setBulkTicketModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"any" | "all">("any");
  const [startDate, setStartDate] = useState<string | null>("");
  const [endDate, setEndDate] = useState<string | null>("");
  const [minEvents, setMinEvents] = useState<number | string>();
  const [maxEvents, setMaxEvents] = useState<number | string>();
  const [minTickets, setMinTickets] = useState<number | string>();
  const [maxTickets, setMaxTickets] = useState<number | string>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const form = useForm({
    initialValues: {
      discord_id: "",
      email: "",
      full_name: "",
      phone: "",
      tags: [],
    },
    validate: {
      discord_id: (value) => (!value ? "Discord ID is required" : null),
      full_name: (value) => (!value ? "Full name is required" : null),
      email: (value) => (value && !/^\S+@\S+$/.test(value) ? "Invalid email" : null),
    },
  });

  // Fetch groups and tags on component mount
  useEffect(() => {
    const fetchGroupsAndTags = async () => {
      try {
        const tagsData = await apiClient.get<Tag[] | { results: Tag[] }>(
          `/tags/?page_size=${MAX_TAG_COUNT}`
        );

        // Handle both array and object responses
        const tagsArray = Array.isArray(tagsData) ? tagsData : tagsData.results || [];
        setTags(tagsArray);
      } catch (error) {
        console.error("Error fetching groups and tags:", error);
        setTags([]); // Ensure tags is always an array
      }
    };
    fetchGroupsAndTags();
  }, []);

  const fetchContacts = useCallback(
    async (url?: string) => {
      try {
        setLoading(true);

        let fetchUrl = url;

        // If no URL provided, build the initial query
        if (!fetchUrl) {
          const params = new URLSearchParams();
          if (searchQuery) params.append("search", searchQuery);
          if (minEvents) params.append("min_events", minEvents.toString());
          if (minTickets) params.append("min_tickets", minTickets.toString());
          if (maxTickets) params.append("max_tickets", maxTickets.toString());
          if (maxEvents) params.append("max_tickets", maxEvents.toString());
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);

          if (selectedTagIds.length > 0) {
            params.append("tag_ids", selectedTagIds.join(","));
            params.append("tag_mode", tagMode);
          }
          fetchUrl = `/contacts/?${params}`;
        }

        console.log("Fetch URL:", fetchUrl);

        const data = await apiClient.get<{
          results: Contact[];
          count: number;
          next: string | null;
          previous: string | null;
        }>(fetchUrl || `/contacts/`);

        console.log("Fetched contacts data:", data);
        setContacts(data.results);
        setTotalCount(data.count);
        setNextUrl(data.next);
        setPreviousUrl(data.previous);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      endDate,
      maxEvents,
      maxTickets,
      minEvents,
      minTickets,
      searchQuery,
      selectedTagIds,
      startDate,
      tagMode,
    ]
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleReset = () => {
    setEndDate("");
    setMaxEvents("");
    setMaxTickets("");
    setMinEvents("");
    setMinTickets("");
    setSearchQuery("");
    setSelectedTagIds([]);
    setStartDate("");
    setTagMode("any");
  };

  const handleRowClick = (contact: Contact) => {
    router.push(`/contacts/${contact.id}`);
  };

  const handleAddContact = () => {
    form.reset();
    setSelectedTags([]);
    setAddModalOpen(true);
  };

  const handleSubmitContact = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      // Step 1: Create the contact
      const contactData = {
        discord_id: values.discord_id,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
      };

      const newContact = await apiClient.post<Contact>("/contacts/", contactData);

      // Step 2: Assign tags to the contact
      if (selectedTags.length > 0) {
        const tagAssignmentPromises = selectedTags.map((tagName) =>
          apiClient.post("/tag-assignments/", {
            contact_id: newContact.id,
            tag_name: tagName,
          })
        );
        await Promise.all(tagAssignmentPromises);
      }

      setAddModalOpen(false);
      form.reset();
      setSelectedTags([]);
      fetchContacts();
    } catch (error) {
      console.error("Error creating contact:", error);
      alert("Failed to create contact. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      return next.add(id);
    });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {/* Header with title and action buttons */}
        <Group justify="space-between">
          <Title order={2}>Contacts</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddContact}>
            Add contact
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group gap="md" align="flex-end" grow>
              <TextInput
                label="Search"
                placeholder="Search by name, Discord ID, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
              />

              <Group gap={0} align="flex-end" style={{ flex: 1 }}>
                <Select
                  label="Tags"
                  data={[
                    { value: "any", label: "Any of" },
                    { value: "all", label: "All of" },
                  ]}
                  value={tagMode}
                  onChange={(v) => setTagMode((v as "any" | "all") || "any")}
                  allowDeselect={false}
                  styles={{
                    input: {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRight: "none",
                      width: 100,
                    },
                  }}
                />
                <MultiSelect
                  data={tags.map((t) => ({ value: String(t.id), label: t.name }))}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder="Search tags..."
                  searchable
                  clearable
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      overflowX: "auto",
                      flexWrap: "nowrap",
                    },
                  }}
                />
              </Group>
            </Group>
            <Group>
              <>
                <ContactNumberInput
                  label="Minimum Events Attended"
                  value={minEvents}
                  setValue={setMinEvents}
                  placeholder="Min Events..."
                />
                <ContactNumberInput
                  label="Maximum Events Attended"
                  value={maxEvents}
                  setValue={setMaxEvents}
                  placeholder="Max Events..."
                />
                <ContactNumberInput
                  label="Minimum Closed Tickets"
                  value={minTickets}
                  setValue={setMinTickets}
                  placeholder="Min Tickets..."
                />
                <ContactNumberInput
                  label="Maximum Closed Tickets"
                  value={maxTickets}
                  setValue={setMaxTickets}
                  placeholder="Max Tickets..."
                />
                <DateInput
                  label="Search Start Time"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date..."
                />
                <DateInput
                  label="Search End Time"
                  onChange={setEndDate}
                  value={endDate}
                  placeholder="End Date..."
                />
              </>
            </Group>
            <Group gap="sm">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Create Tickets action bar */}
        <Paper p="sm" withBorder>
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              {selectedRows.size > 0
                ? `${selectedRows.size} selected`
                : "Select contacts to create tickets"}
            </Text>
            <Group gap="sm">
              <Button
                variant="light"
                onClick={() => setBulkTicketModalOpen(true)}
                disabled={selectedRows.size === 0}
              >
                Create Tickets
              </Button>
              <Button
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => setSelectedRows(new Set())}
                disabled={selectedRows.size === 0}
              >
                Clear
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Contacts Table */}
        <ContactTable
          contacts={contacts}
          loading={loading}
          onRowClick={handleRowClick}
          showTitle={false}
          selectedIds={selectedRows}
          toggleSelect={toggleRowSelection}
        />

        {/* Pagination, result and selected count */}
        <Paper p="sm" withBorder>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Text>
                {totalCount} {totalCount === 1 ? "contact" : "contacts"} found
              </Text>
            </Group>

            <Group gap="xs">
              <ActionIcon
                variant="filled"
                disabled={!previousUrl}
                onClick={() => previousUrl && fetchContacts(previousUrl)}
                aria-label="Previous page"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                disabled={!nextUrl}
                onClick={() => nextUrl && fetchContacts(nextUrl)}
                aria-label="Next page"
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      </Stack>

      {/* Add Contact Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Contact"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmitContact)}>
          <Stack gap="md">
            <TextInput
              label="Discord ID"
              placeholder="Enter Discord ID"
              required
              {...form.getInputProps("discord_id")}
            />
            <TextInput
              label="Name"
              placeholder="Enter name"
              required
              {...form.getInputProps("full_name")}
            />
            <TextInput
              label="Email"
              placeholder="Enter email (optional)"
              type="email"
              {...form.getInputProps("email")}
            />
            <TextInput
              label="Phone"
              placeholder="Enter phone number (optional)"
              {...form.getInputProps("phone")}
            />

            <MultiSelect
              label="Tags"
              placeholder="Select tags"
              value={selectedTags}
              onChange={(value) => setSelectedTags(value || [])}
              data={tags.map((t) => ({ value: t.name, label: t.name }))}
              searchable
              clearable
            />

            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Add Contact
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <TicketBulkCreateModal
        opened={bulkTicketModalOpen}
        onClose={() => setBulkTicketModalOpen(false)}
        contactIds={Array.from(selectedRows)}
        onSuccess={() => {
          setSelectedRows(new Set());
        }}
      />
    </Container>
  );
}

function ContactNumberInput({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string | number | undefined;
  setValue: (a: string | number | undefined) => void;
  placeholder: string | undefined;
}) {
  return (
    <NumberInput
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(num) => {
        setValue(typeof num === "number" ? num : 0);
      }}
      allowNegative={false}
      style={{ flex: 1 }}
    />
  );
}

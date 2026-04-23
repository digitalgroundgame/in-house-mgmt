"use client";

import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  Text,
  TextInput,
  Stack,
  Modal,
  MultiSelect,
  ActionIcon,
  NumberInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconPlus,
  IconFileUpload,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState, useEffect, Component } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";
import { TicketBulkCreateModal } from "@/app/components/tickets/TicketBulkCreateModal";
import { SearchSelect, type SearchSelectOption } from "@/app/components/SearchSelect";
import ContactTable, {
  type Contact,
  type Group as ContactGroup,
  type Tag,
} from "@/app/components/ContactTable";
import "./page.css";

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bulkTicketModalOpen, setBulkTicketModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>("all");
  const [selectedTag, setSelectedTag] = useState<SearchSelectOption<Tag> | null>(null);
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
      full_name: "",
      email: "",
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
    fetchGroupsAndTags();
  }, []);

  // Fetch contacts whenever filters change (reset to first page)
  useEffect(() => {
    fetchContacts();
  }, [
    searchQuery,
    selectedGroup,
    selectedTag,
    minEvents,
    minTickets,
    maxEvents,
    maxTickets,
    startDate,
    endDate,
  ]);

  const fetchGroupsAndTags = async () => {
    try {
      const tagsData = await apiClient.get<Tag[] | { results: Tag[] }>("/tags/");
      console.log("Tags data:", tagsData);

      // Handle both array and object responses
      const tagsArray = Array.isArray(tagsData) ? tagsData : tagsData.results || [];
      setTags(tagsArray);
    } catch (error) {
      console.error("Error fetching groups and tags:", error);
      setTags([]); // Ensure tags is always an array
    }
  };

  const fetchContacts = async (url?: string) => {
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
        if (maxEvents) params.append("max_events", maxEvents.toString());
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);

        if (selectedTag) params.append("tag", selectedTag.id.toString());
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
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedGroup("all");
    setSelectedTag(null);
    setMaxEvents("");
    setMinEvents("");
    setMaxTickets("");
    setMinTickets("");
    setStartDate("");
    setEndDate("");
    fetchContacts();
  };

  const handleRowClick = (contact: Contact) => {
    // TODO: Navigate to contact detail page or show modal
    router.push(`/contacts/${contact.id}`);
    console.log("Clicked contact:", contact);
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleUploadCSV = () => {
    // TODO: Open CSV upload modal
    console.log("Upload CSV clicked");
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
            <Group gap="md" align="flex-end">
              <TextInput
                label="Search"
                placeholder="Search by name, Discord ID, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
              />

              <SearchSelect<Tag>
                endpoint="/tags/"
                label="Tag"
                placeholder="Search tags..."
                value={selectedTag}
                onChange={setSelectedTag}
                clearable
                mapResult={(tag) => ({
                  id: tag.id,
                  label: tag.name,
                  raw: tag,
                })}
              />
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

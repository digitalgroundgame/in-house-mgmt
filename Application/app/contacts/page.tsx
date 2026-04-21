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
  Select,
  RangeSlider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconPlus,
  IconFileUpload,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
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
import { type EventCategory } from "@/app/components/event-utils";
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
  const [eventRange, setEventRange] = useState<[number, number]>([0, 50]);
  const [ticketRange, setTicketRange] = useState<[number, number]>([0, 50]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
    eventRange,
    ticketRange,
    startDate,
    endDate,
    selectedCategoryId,
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

    try {
      const { results } = await apiClient.get<{ results: EventCategory[] }>("/event-categories/");
      setCategories(results || []);
    } catch {
      setCategories([]);
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
        if (eventRange[0] > 0) params.append("min_events", eventRange[0].toString());
        if (eventRange[1] < 50) params.append("max_events", eventRange[1].toString());
        if (ticketRange[0] > 0) params.append("min_tickets", ticketRange[0].toString());
        if (ticketRange[1] < 50) params.append("max_tickets", ticketRange[1].toString());
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
        if (selectedCategoryId) params.append("event_category_id", selectedCategoryId);

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
    setEventRange([0, 50]);
    setTicketRange([0, 50]);
    setStartDate("");
    setEndDate("");
    setSelectedCategoryId(null);
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
          <Group gap="sm">
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddContact}>
              Add contact
            </Button>
            {/*      <Button
              variant="outline"
              leftSection={<IconFileUpload size={16} />}
              onClick={handleUploadCSV}
            >
              Upload CSV
            </Button> */}
          </Group>
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

              <Select
                label="Event Type"
                placeholder="All types"
                data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                clearable
              />
            </Group>
            <Group grow>
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Events Attended ({eventRange[0]}–{eventRange[1] === 50 ? "50+" : eventRange[1]})
                </Text>
                <RangeSlider
                  min={0}
                  max={50}
                  value={eventRange}
                  onChangeEnd={setEventRange}
                  marks={[
                    { value: 0, label: "0" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50+" },
                  ]}
                  mt="xs"
                  mb="lg"
                />
              </Stack>
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Closed Tickets ({ticketRange[0]}–{ticketRange[1] === 50 ? "50+" : ticketRange[1]})
                </Text>
                <RangeSlider
                  min={0}
                  max={50}
                  value={ticketRange}
                  onChangeEnd={setTicketRange}
                  marks={[
                    { value: 0, label: "0" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50+" },
                  ]}
                  mt="xs"
                  mb="lg"
                />
              </Stack>
            </Group>
            <Group>
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
            </Group>
            <Group gap="sm">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </Group>
          </Stack>
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

              {selectedRows.size > 0 && (
                <>
                  <Text size="sm" c="dimmed">
                    {selectedRows.size} selected
                  </Text>
                  <Button size="xs" variant="light" onClick={() => setBulkTicketModalOpen(true)}>
                    Create Tickets
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    px={6}
                    onClick={() => setSelectedRows(new Set())}
                  >
                    Clear
                  </Button>
                </>
              )}
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

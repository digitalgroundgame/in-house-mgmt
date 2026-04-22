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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconPlus,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";
import { TicketBulkCreateModal } from "@/app/components/tickets/TicketBulkCreateModal";
import { SearchSelect, type SearchSelectOption } from "@/app/components/SearchSelect";
import DebouncedRangeSliderInput from "@/app/components/DebouncedRangeSliderInput";
import ContactTable, { type Contact, type Tag } from "@/app/components/ContactTable";
import { type EventCategory } from "@/app/components/event-utils";
import "./page.css";

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bulkTicketModalOpen, setBulkTicketModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<SearchSelectOption<Tag> | null>(null);
  const [startDate, setStartDate] = useState<string | null>("");
  const [endDate, setEndDate] = useState<string | null>("");
  const [eventRange, setEventRange] = useState<[number, number]>([0, 20]);
  const [ticketRange, setTicketRange] = useState<[number, number]>([0, 20]);
  const [debouncedEventRange, setDebouncedEventRange] = useState<[number, number]>([0, 20]);
  const [debouncedTicketRange, setDebouncedTicketRange] = useState<[number, number]>([0, 20]);
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

  const fetchContacts = useCallback(
    async (url?: string) => {
      try {
        setLoading(true);

        let fetchUrl = url;

        // If no URL provided, build the initial query
        if (!fetchUrl) {
          const params = new URLSearchParams();
          if (searchQuery) params.append("search", searchQuery);
          if (debouncedEventRange[0] > 0)
            params.append("min_events", debouncedEventRange[0].toString());
          if (debouncedEventRange[1] < 20)
            params.append("max_events", debouncedEventRange[1].toString());
          if (debouncedTicketRange[0] > 0)
            params.append("min_tickets", debouncedTicketRange[0].toString());
          if (debouncedTicketRange[1] < 20)
            params.append("max_tickets", debouncedTicketRange[1].toString());
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
    },
    [
      debouncedEventRange,
      debouncedTicketRange,
      endDate,
      searchQuery,
      selectedCategoryId,
      selectedTag,
      startDate,
    ]
  );

  // Fetch groups and tags on component mount
  useEffect(() => {
    fetchGroupsAndTags();
  }, []);

  // Fetch contacts whenever filters change (reset to first page)
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedTag(null);
    setEventRange([0, 20]);
    setTicketRange([0, 20]);
    setDebouncedEventRange([0, 20]);
    setDebouncedTicketRange([0, 20]);
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
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
            <Group gap="md" align="flex-end">
              <TextInput
                label="Search"
                placeholder="Search name, Discord ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1, minWidth: 200 }}
              />
              <DateInput
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date..."
                leftSection={<IconCalendar size={16} />}
              />
              <DateInput
                label="End Date"
                onChange={setEndDate}
                value={endDate}
                placeholder="End Date..."
                leftSection={<IconCalendar size={16} />}
              />
            </Group>
            <Group gap="md" align="flex-end">
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
                label="Event Category"
                placeholder="All categories"
                data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                clearable
              />

              <DebouncedRangeSliderInput
                label="# of Events Attended"
                min={0}
                max={20}
                minRange={0}
                value={eventRange}
                onChange={setEventRange}
                onDebouncedChange={setDebouncedEventRange}
                labelFormatter={(v) => (v === 20 ? "20+" : v)}
              />
              <DebouncedRangeSliderInput
                label="# of Closed Tickets"
                min={0}
                max={20}
                minRange={0}
                value={ticketRange}
                onChange={setTicketRange}
                onDebouncedChange={setDebouncedTicketRange}
                labelFormatter={(v) => (v === 20 ? "20+" : v)}
              />
              <Button variant="outline" onClick={handleReset} ml="auto">
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

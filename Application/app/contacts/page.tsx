'use client';

import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  Text,
  TextInput,
  Select,
  Stack,
  Modal,
  MultiSelect,
  ActionIcon
} from '@mantine/core';
import { IconPlus, IconFileUpload, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import ContactTable, { type Contact, type Group as ContactGroup, type Tag } from '@/app/components/ContactTable';
import './page.css';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>('all');
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
      discord_id: '',
      full_name: '',
      email: '',
      phone: '',
      tags: []
    },
    validate: {
      discord_id: (value) => (!value ? 'Discord ID is required' : null),
      full_name: (value) => (!value ? 'Full name is required' : null),
      email: (value) => (value && !/^\S+@\S+$/.test(value) ? 'Invalid email' : null)
    }
  });



  // Fetch groups and tags on component mount
  useEffect(() => {
    fetchGroupsAndTags();
  }, []);

  // Fetch contacts whenever filters change (reset to first page)
  useEffect(() => {
    fetchContacts();
  }, [searchQuery, selectedGroup, selectedTag]);

  const fetchGroupsAndTags = async () => {
    try {
      const [tagsRes] = await Promise.all([
        fetch('/api/tags/')
      ]);

      console.log('Tags response:', tagsRes);

      const tagsData = await tagsRes.json();
      console.log('Tags data:', tagsData);

      // Handle both array and object responses
      const tagsArray = Array.isArray(tagsData) ? tagsData : (tagsData.results || []);
      setTags(tagsArray);
    } catch (error) {
      console.error('Error fetching groups and tags:', error);
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
        if (searchQuery) params.append('q', searchQuery);
        if (selectedTag && selectedTag !== 'all') params.append('tag', selectedTag);
        fetchUrl = `/api/contacts/?${params}`;
      }

      console.log("Fetch URL:", fetchUrl);

      const response = await fetch(fetchUrl);
      const data = await response.json();

      console.log('Fetched contacts data:', data);
      setContacts(data.results);
      setTotalCount(data.count);
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedGroup('all');
    setSelectedTag('all');
    fetchContacts();
  };

  const handleRowClick = (contact: Contact) => {
    // TODO: Navigate to contact detail page or show modal
    console.log('Clicked contact:', contact);
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
        phone: values.phone
      };

      const contactResponse = await fetch('/api/contacts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!contactResponse.ok) {
        throw new Error('Failed to create contact');
      }

      const newContact = await contactResponse.json();

      // Step 2: Assign tags to the contact
      if (selectedTags.length > 0) {
        const tagAssignmentPromises = selectedTags.map(tagName =>
          fetch('/api/tag-assignments/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contact_id: newContact.id,
              tag_name: tagName
            }),
          })
        );
        await Promise.all(tagAssignmentPromises);
      }

      setAddModalOpen(false);
      form.reset();
      setSelectedTags([]);
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleUploadCSV = () => {
    // TODO: Open CSV upload modal
    console.log('Upload CSV clicked');
  };


  const tagOptions = [
    { value: 'all', label: 'Any' },
    ...tags.map(t => ({ value: t.id.toString(), label: t.name }))
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {/* Header with title and action buttons */}
        <Group justify="space-between">
          <Title order={2}>Contacts</Title>
          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddContact}
            >
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

              <Select
                label="Tag"
                placeholder="Select tag"
                value={selectedTag}
                onChange={setSelectedTag}
                data={tagOptions}
                style={{ minWidth: 200 }}
              />
            </Group>
            <Group gap="sm">
              <Button variant="outline" onClick={handleReset}>Reset</Button>
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
                {totalCount} {totalCount === 1 ? 'contact' : 'contacts'} found
              </Text>

              {selectedRows.size > 0 && (
                <>
                  <Text size="sm" c="dimmed">
                    {selectedRows.size} selected
                  </Text>
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
              {...form.getInputProps('discord_id')}
            />
            <TextInput
              label="Name"
              placeholder="Enter name"
              required
              {...form.getInputProps('full_name')}
            />
            <TextInput
              label="Email"
              placeholder="Enter email (optional)"
              type="email"
              {...form.getInputProps('email')}
            />
            <TextInput
              label="Phone"
              placeholder="Enter phone number (optional)"
              {...form.getInputProps('phone')}
            />

            <MultiSelect
              label="Tags"
              placeholder="Select tags"
              value={selectedTags}
              onChange={(value) => setSelectedTags(value || [])}
              data={tags.map(t => ({ value: t.name, label: t.name }))}
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
    </Container>
  );
}

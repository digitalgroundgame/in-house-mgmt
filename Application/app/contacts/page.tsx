'use client';

import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  TextInput,
  Stack,
  Modal,
  MultiSelect,
  ActionIcon
} from '@mantine/core';
import { IconPlus, IconFileUpload, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import PeopleTable, { type Person, type Group as PersonGroup, type Tag } from '@/app/components/PeopleTable';
import './page.css';

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Fetch people whenever filters change (reset to first page)
  useEffect(() => {
    fetchPeople();
  }, [searchQuery, selectedGroup, selectedTagIds]);

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

  const fetchPeople = async (url?: string) => {
    try {
      setLoading(true);

      let fetchUrl = url;

      // If no URL provided, build the initial query
      if (!fetchUrl) {
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        for (const selectedTagId of selectedTagIds) {
          params.append('tag', selectedTagId);
        }
        fetchUrl = `/api/contacts/?${params}`;
      }

      console.log("Fetch URL:", fetchUrl);

      const response = await fetch(fetchUrl);
      const data = await response.json();

      console.log('Fetched people data:', data);
      setPeople(data.results);
      setTotalCount(data.count);
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedGroup('all');
    setSelectedTagIds([]);
  };

  const handleRowClick = (person: Person) => {
    // TODO: Navigate to person detail page or show modal
    console.log('Clicked person:', person);
  };

  const handleAddPerson = () => {
    form.reset();
    setSelectedTags([]);
    setAddModalOpen(true);
  };

  const handleSubmitPerson = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      // Include selectedTags in the submission
      const personData = {
        ...values,
        tags: selectedTags
      };

      // TODO: Fix this API call
      const response = await fetch('/api/people/person-and-tags/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personData),
      });


      if (!response.ok) {
        throw new Error('Failed to create person');
      }

      setAddModalOpen(false);
      form.reset();
      setSelectedTags([]);
      fetchPeople();
    } catch (error) {
      console.error('Error creating person:', error);
      alert('Failed to create person. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadCSV = () => {
    // TODO: Open CSV upload modal
    console.log('Upload CSV clicked');
  };


  const tagOptions = [
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
              onClick={handleAddPerson}
            >
              Add person
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

              <MultiSelect
                label="Tag"
                placeholder="Select tags"
                value={selectedTagIds}
                onChange={setSelectedTagIds}
                data={tagOptions}
                searchable
                clearable
                style={{ minWidth: 240 }}
              />
            </Group>
            <Group gap="sm">
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </Group>
          </Stack>
        </Paper>

        {/* People Table */}
        <PeopleTable
          people={people}
          loading={loading}
          onRowClick={handleRowClick}
          showTitle={false}
        />

        {/* Pagination and count */}
        <Paper p="sm" withBorder>
          <Group justify="space-between">
            <span>{totalCount} {totalCount === 1 ? 'person' : 'people'} found</span>
            <Group gap="xs">
              <ActionIcon
                variant="filled"
                disabled={!previousUrl}
                onClick={() => previousUrl && fetchPeople(previousUrl)}
                aria-label="Previous page"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                disabled={!nextUrl}
                onClick={() => nextUrl && fetchPeople(nextUrl)}
                aria-label="Next page"
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      </Stack>

      {/* Add Person Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Person"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmitPerson)}>
          <Stack gap="md">
            <TextInput
              label="Discord ID"
              placeholder="Enter Discord ID"
              required
              {...form.getInputProps('did')}
            />
            <TextInput
              label="Name"
              placeholder="Enter name"
              required
              {...form.getInputProps('name')}
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
                Add Person
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

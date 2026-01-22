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
  ActionIcon,
  NumberInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconPlus,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { ReadonlyURLSearchParams, useRouter, useSearchParams } from 'next/navigation';
import ContactTable, { Contact, type Tag } from '@/app/components/ContactTable';
import { useState } from 'react';
import CreateContactsModal from './CreateContactsModal';
import { TicketBulkCreateModal } from '../components/TicketBulkCreateModal';

export default function ContactsClient({
  contacts,
  totalCount,
  nextPage,
  previousPage,
  tags,
}: {
  contacts: Contact[],
  totalCount: number,
  nextPage: boolean,
  previousPage: boolean,
  tags: Tag[]
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false)
  const [bulkTicketModalOpen, setBulkTicketModalOpen] = useState<boolean>(false)

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const tagOptions = [
    { value: 'all', label: 'Any' },
    ...tags.map(t => ({ value: t.id.toString(), label: t.name }))
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Contacts</Title>
          <Button onClick={() => setAddModalOpen(true)} leftSection={<IconPlus size={16} />}>Add contact</Button>
        </Group>

        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group>
              <TextInput
                label="Search"
                value={searchParams.get('search') ?? ''}
                onChange={(e) => updateParam('search', e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
              />

              <Select
                label="Tag"
                value={searchParams.get('tag') ?? 'all'}
                onChange={(v) => updateParam('tag', v ?? undefined)}
                data={tagOptions}
                style={{ minWidth: 200 }}
              />
            </Group>

            <Group>
              <NumberInput
                label="Min Events"
                value={Number(searchParams.get('min_events') ?? '')}
                onChange={(v) => updateParam('min_events', v ? String(v) : undefined)}
                style={{flex: 1}}
              />

              <NumberInput
                label="Max Events"
                value={Number(searchParams.get('max_events') ?? '')}
                onChange={(v) => updateParam('max_events', v ? String(v) : undefined)}
                style={{flex: 1}}
              />

              <NumberInput
                label="Min Tickets"
                value={Number(searchParams.get('min_tickets') ?? '')}
                onChange={(v) => updateParam('min_tickets', v ? String(v) : undefined)}
                style={{flex: 1}}
              />

              <NumberInput
                label="Max Tickets"
                value={Number(searchParams.get('max_tickets') ?? '')}
                onChange={(v) => updateParam('max_tickets', v ? String(v) : undefined)}
                style={{flex: 1}}
              />
              <DateInput
                label="Start Date"
                value={searchParams.get('start_date')}
                onChange={(v) => updateParam('start_date', v ?? undefined)}
                style={{flex: 1}}
              />

              <DateInput
                label="End Date"
                value={searchParams.get('end_date')}
                onChange={(v) => updateParam('end_date', v ?? undefined)}
                style={{flex: 1}}
              />
            </Group>

            <Group>
              <Button variant="outline" onClick={() => router.replace('?')}>
                Reset
              </Button>
            </Group>
          </Stack>
        </Paper>

        <ContactTable
          contacts={contacts}
          toggleSelect={toggleRowSelection}
          onRowClick={(c: Contact) => router.push(`/contacts/${c.id}`)}
        />

        <Paper p="sm" withBorder>
          <Group justify="space-between">
            <Text>{totalCount} contacts found</Text>
              {selectedRows.size > 0 && (
                <>
                  <Text size="sm" c="dimmed">
                    {selectedRows.size} selected
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setBulkTicketModalOpen(true)}
                  >
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

            <Group gap="xs">
              <ActionIcon
                disabled={!previousPage}
                onClick={() => previousPage && updateParam('page', decrementPageSearchParam(searchParams))}
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <ActionIcon
                disabled={!nextPage}
                onClick={() => nextPage && updateParam('page', incrementPageSearchParam(searchParams))}
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      </Stack>
      <CreateContactsModal opened={addModalOpen} setOpened={setAddModalOpen} tags={tags}/>
      <TicketBulkCreateModal
        opened={bulkTicketModalOpen}
        onClose={() => setBulkTicketModalOpen(false)}
        contactIds={Array.from(selectedRows)}
        events={[]} // 🔧 plug in events once available
        users={[]}  // 🔧 plug in users once available
        onSuccess={() => {
          setSelectedRows(new Set());
        }}
      />
    </Container>
  );
}

function incrementPageSearchParam(searchParams: ReadonlyURLSearchParams): string {
  return (Number.parseInt(searchParams.get('page') ?? '0') + 1).toString()
}

function decrementPageSearchParam(searchParams: any): string {
  return (Number.parseInt(searchParams.get('page') ?? '0') - 1).toString()
}
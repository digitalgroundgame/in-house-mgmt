'use client';

import {
    Title,
    Text,
    Stack,
    Paper,
    LoadingOverlay,
    Box,
    Group,
    Grid,
    Badge,
    Divider,
    TextInput,
    ActionIcon,
    ScrollArea,
    Tooltip,
} from "@mantine/core";
import { useState, useEffect, useCallback } from 'react';
import { IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface EventData {
    id: number;
    name: string;
    event_status: string;
    status_display: string;
    starts_at: string;
    ends_at: string;
    location_display: string;
}

interface EventParticipation {
    id: number;
    event: EventData;
    status: string;
    status_display: string;
}

interface FilterState {
    value: string;
    mode: 'include' | 'exclude';
}

interface StatusOption {
    value: string;
    label: string;
}

function FilterBadgeGroup({ label, options, filter, onToggle }: {
    label: string;
    options: StatusOption[];
    filter: FilterState | null;
    onToggle: (value: string) => void;
}) {
    return (
        <Stack gap={4}>
            <Text size="xs" c="dimmed" fw={600}>{label}</Text>
            <Group gap={4}>
                {options.map((s) => {
                    const active = filter?.value === s.value;
                    const excluding = active && filter?.mode === 'exclude';
                    return (
                        <Tooltip
                            key={s.value}
                            label={active ? (excluding ? 'Excluding this — click to clear' : 'Filtering by this — click to exclude') : 'Click to filter'}
                        >
                            <Badge
                                size="sm"
                                variant={active ? (excluding ? 'outline' : 'filled') : 'light'}
                                color={excluding ? 'red' : 'gray'}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onToggle(s.value)}
                            >
                                {excluding && '✕ '}{s.label}
                            </Badge>
                        </Tooltip>
                    );
                })}
            </Group>
        </Stack>
    );
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export default function EventHistory({ contactId }: { contactId: string }) {
    const router = useRouter();

    const [participations, setParticipations] = useState<EventParticipation[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsNext, setEventsNext] = useState<string | null>(null);
    const [eventsPrevious, setEventsPrevious] = useState<string | null>(null);
    const [eventsCount, setEventsCount] = useState(0);
    const [eventsPage, setEventsPage] = useState(1);
    const [eventSearch, setEventSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterState | null>(null);
    const [typeFilter, setTypeFilter] = useState<FilterState | null>(null);
    const [eventStatuses, setEventStatuses] = useState<StatusOption[]>([]);
    const [commitmentStatuses, setCommitmentStatuses] = useState<StatusOption[]>([]);

    useEffect(() => {
        fetchStatusOptions();
    }, [contactId]);

    const fetchStatusOptions = async () => {
        try {
            const [eventRes, commitmentRes] = await Promise.all([
                fetch('/api/event-statuses/'),
                fetch('/api/commitment-statuses/'),
            ]);
            setEventStatuses(await eventRes.json());
            setCommitmentStatuses(await commitmentRes.json());
        } catch (error) {
            console.error('Error fetching status options:', error);
        }
    };

    const buildEventsUrl = useCallback((page?: number) => {
        const params = new URLSearchParams();
        if (eventSearch) params.set('search', eventSearch);
        if (statusFilter) {
            if (statusFilter.mode === 'include') params.set('status', statusFilter.value);
            else params.set('exclude_status', statusFilter.value);
        }
        if (typeFilter) {
            if (typeFilter.mode === 'include') params.set('type', typeFilter.value);
            else params.set('exclude_type', typeFilter.value);
        }
        if (page && page > 1) params.set('page', String(page));
        const qs = params.toString();
        return `/api/contacts/${contactId}/events/${qs ? `?${qs}` : ''}`;
    }, [contactId, eventSearch, statusFilter, typeFilter]);

    const fetchEvents = useCallback(async (url?: string) => {
        try {
            setEventsLoading(true);
            const response = await fetch(url || buildEventsUrl());
            const data = await response.json();
            setParticipations(data.results || []);
            setEventsNext(data.next);
            setEventsPrevious(data.previous);
            setEventsCount(data.count || 0);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setEventsLoading(false);
        }
    }, [buildEventsUrl]);

    useEffect(() => {
        setEventsPage(1);
        fetchEvents(buildEventsUrl(1));
    }, [eventSearch, statusFilter, typeFilter]);

    const toggleFilter = (
        current: FilterState | null,
        setter: (f: FilterState | null) => void,
        value: string
    ) => {
        if (!current || current.value !== value) {
            setter({ value, mode: 'include' });
        } else if (current.mode === 'include') {
            setter({ value, mode: 'exclude' });
        } else {
            setter(null);
        }
    };

    const totalPages = Math.ceil(eventsCount / 5);

    return (
        <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="lg" radius="md" h="100%">
                <Box pos="relative" style={{ minHeight: 350, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <LoadingOverlay visible={eventsLoading} />
                    <Stack gap="sm" style={{ flex: 1 }}>
                        <Title order={4}>Event History</Title>

                        <TextInput
                            placeholder="Search events..."
                            leftSection={<IconSearch size={16} />}
                            value={eventSearch}
                            onChange={(e) => setEventSearch(e.currentTarget.value)}
                            size="xs"
                        />

                        <FilterBadgeGroup
                            label="Event Status"
                            options={eventStatuses}
                            filter={statusFilter}
                            onToggle={(v) => toggleFilter(statusFilter, setStatusFilter, v)}
                        />

                        <FilterBadgeGroup
                            label="Commitment"
                            options={commitmentStatuses}
                            filter={typeFilter}
                            onToggle={(v) => toggleFilter(typeFilter, setTypeFilter, v)}
                        />

                        <Divider />

                        <ScrollArea style={{ flex: 1 }}>
                            <Stack gap="xs">
                                {participations.length === 0 && !eventsLoading ? (
                                    <Text c="dimmed" size="sm" ta="center" py="md">
                                        No events found.
                                    </Text>
                                ) : (
                                    participations.map((p) => (
                                        <Paper
                                            key={p.id}
                                            withBorder
                                            p="xs"
                                            radius="sm"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => router.push(`/events/${p.event.id}`)}
                                        >
                                            <Group justify="space-between" wrap="nowrap">
                                                <div style={{ minWidth: 0 }}>
                                                    <Text size="sm" fw={500} truncate="end">
                                                        {p.event.name || 'Unnamed Event'}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {formatDate(p.event.starts_at)}
                                                    </Text>
                                                </div>
                                                <Group gap={4} wrap="nowrap">
                                                    <Badge size="xs" variant="light">
                                                        {p.event.status_display}
                                                    </Badge>
                                                    <Badge size="xs" variant="dot">
                                                        {p.status_display}
                                                    </Badge>
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))
                                )}
                            </Stack>
                        </ScrollArea>
                    </Stack>

                    <Group justify="center" gap="xs" mt="sm">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={!eventsPrevious}
                            onClick={() => {
                                if (eventsPrevious) {
                                    setEventsPage((p) => p - 1);
                                    fetchEvents(eventsPrevious);
                                }
                            }}
                        >
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                        <Text size="xs" c="dimmed">
                            {eventsPage} / {totalPages}
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={!eventsNext}
                            onClick={() => {
                                if (eventsNext) {
                                    setEventsPage((p) => p + 1);
                                    fetchEvents(eventsNext);
                                }
                            }}
                        >
                            <IconChevronRight size={16} />
                        </ActionIcon>
                    </Group>
                </Box>
            </Paper>
        </Grid.Col>
    );
}

'use client';

import {
    Title,
    Text,
    Stack,
    Paper,
    LoadingOverlay,
    Box,
    Button,
    Group,
    Grid,
    Badge,
    Divider,
    SimpleGrid,
    Skeleton,
    TextInput,
    ActionIcon,
    ScrollArea,
    Tooltip,
} from "@mantine/core";
import { BarChart } from '@mantine/charts';
import { useState, useEffect, use, useCallback } from 'react';
import { IconArrowLeft, IconMail, IconPhone, IconBrandDiscord, IconCalendar, IconNote, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface Contact {
    id: number;
    full_name: string;
    discord_id: string;
    email: string;
    phone: string;
    note: string;
    created_at: string;
    modified_at: string;
    tags: Tag[];
}

interface AcceptanceRateData {
    [ticketType: string]: {
        UNKNOWN: number;
        REJECTED: number;
        AGREED: number;
        DELIVERED: number;
        FAILED: number;
        GHOSTED: number;
    };
}

interface ChartData {
    ticketType: string;
    UNKNOWN: number;
    REJECTED: number;
    AGREED: number;
    DELIVERED: number;
    FAILED: number;
    GHOSTED: number;
}

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

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [contact, setContact] = useState<Contact | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);

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
        fetchContactDetails();
        fetchAcceptanceRate();
        fetchStatusOptions();
    }, [id]);

    const fetchContactDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/contacts/${id}/`);
            const data = await response.json();
            setContact(data);
        } catch (error) {
            console.error('Error fetching contact details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAcceptanceRate = async () => {
        try {
            setChartLoading(true);
            const response = await fetch(`/api/contacts/${id}/acceptance-rate/`);
            const data: AcceptanceRateData = await response.json();

            const transformed: ChartData[] = Object.entries(data).map(([ticketType, statuses]) => ({
                ticketType: ticketType.charAt(0) + ticketType.slice(1).toLowerCase(),
                UNKNOWN: statuses.UNKNOWN,
                REJECTED: statuses.REJECTED,
                AGREED: statuses.AGREED,
                DELIVERED: statuses.DELIVERED,
                FAILED: statuses.FAILED,
                GHOSTED: statuses.GHOSTED,
            }));

            setChartData(transformed);
        } catch (error) {
            console.error('Error fetching acceptance rate:', error);
        } finally {
            setChartLoading(false);
        }
    };

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
        return `/api/contacts/${id}/events/${qs ? `?${qs}` : ''}`;
    }, [id, eventSearch, statusFilter, typeFilter]);

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <Stack gap="md" p="xl">
                <Skeleton height={40} width={150} />
                <Skeleton height={50} width={300} />
                <SimpleGrid cols={2}>
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                </SimpleGrid>
            </Stack>
        );
    }

    return (
        <Stack gap="lg" p="xl">
            <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
                onClick={() => router.back()}
                style={{ alignSelf: 'flex-start' }}
            >
                Back to Contacts
            </Button>

            {/* Header Section */}
            <Paper withBorder p="xl" radius="md">
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Title order={1} mb="xs">{contact?.full_name || 'Unnamed Contact'}</Title>
                        <Text size="sm" c="dimmed">Contact ID: {id}</Text>
                    </div>
                    {contact?.tags && contact.tags.length > 0 && (
                        <Group gap="xs">
                            {contact.tags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    size="lg"
                                    variant="filled"
                                    style={{ backgroundColor: tag.color }}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </Group>
                    )}
                </Group>
            </Paper>

            <Grid gutter="lg">
                {/* Contact Information */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="lg" radius="md" h="100%">
                        <Title order={4} mb="lg">Contact Information</Title>
                        <Stack gap="md">
                            <Group gap="sm">
                                <IconBrandDiscord size={20} style={{ color: '#5865F2' }} />
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Discord ID</Text>
                                    <Text>{contact?.discord_id || '—'}</Text>
                                </div>
                            </Group>

                            <Divider />

                            <Group gap="sm">
                                <IconMail size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Email</Text>
                                    <Text>{contact?.email || '—'}</Text>
                                </div>
                            </Group>

                            <Divider />

                            <Group gap="sm">
                                <IconPhone size={20} style={{ color: 'var(--mantine-color-green-6)' }} />
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Phone</Text>
                                    <Text>{contact?.phone || '—'}</Text>
                                </div>
                            </Group>

                            <Divider />

                            <Group gap="sm">
                                <IconCalendar size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Added</Text>
                                    <Text>{contact?.created_at ? formatDate(contact.created_at) : '—'}</Text>
                                </div>
                            </Group>
                        </Stack>
                    </Paper>
                </Grid.Col>

                {/* Notes Section */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="lg" radius="md" h="100%">
                        <Group gap="sm" mb="lg">
                            <IconNote size={20} />
                            <Title order={4}>Notes</Title>
                        </Group>
                        <Text c={contact?.note ? undefined : 'dimmed'}>
                            {contact?.note || 'No notes for this contact.'}
                        </Text>
                    </Paper>
                </Grid.Col>

                {/* Response Rate Chart */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="lg" radius="md" h="100%">
                        <Box pos="relative" style={{ minHeight: 350 }}>
                            <LoadingOverlay visible={chartLoading} />
                            <Title order={4} mb="lg">Response Rate by Ticket Type</Title>
                            {chartData.length === 0 && !chartLoading ? (
                                <Text c="dimmed" size="sm">No response data available for this contact.</Text>
                            ) : (
                                <BarChart
                                    h={300}
                                    data={chartData}
                                    dataKey="ticketType"
                                    type="stacked"
                                    withLegend
                                    legendProps={{ verticalAlign: 'bottom' }}
                                    series={[
                                        { name: 'AGREED', label: 'Agreed', color: 'indigo.7' },
                                        { name: 'DELIVERED', label: 'Delivered', color: 'blue.5' },
                                        { name: 'UNKNOWN', label: 'Unknown', color: 'gray.5' },
                                        { name: 'REJECTED', label: 'Rejected', color: 'red.7' },
                                        { name: 'FAILED', label: 'Failed', color: 'orange.6' },
                                        { name: 'GHOSTED', label: 'Ghosted', color: 'dark.4' },
                                    ]}
                                />
                            )}
                        </Box>
                    </Paper>
                </Grid.Col>

                {/* Event History */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="lg" radius="md" h="100%">
                        <Box pos="relative" style={{ minHeight: 350 }}>
                            <LoadingOverlay visible={eventsLoading} />
                            <Stack gap="sm">
                                <Title order={4}>Event History</Title>

                                <TextInput
                                    placeholder="Search events..."
                                    leftSection={<IconSearch size={16} />}
                                    value={eventSearch}
                                    onChange={(e) => setEventSearch(e.currentTarget.value)}
                                    size="xs"
                                />

                                <Stack gap={4}>
                                    <Text size="xs" c="dimmed" fw={600}>Event Status</Text>
                                    <Group gap={4}>
                                        {eventStatuses.map((s) => (
                                            <Tooltip
                                                key={s.value}
                                                label={
                                                    statusFilter?.value === s.value
                                                        ? statusFilter.mode === 'include'
                                                            ? 'Filtering by this — click to exclude'
                                                            : 'Excluding this — click to clear'
                                                        : 'Click to filter'
                                                }
                                            >
                                                <Badge
                                                    size="sm"
                                                    variant={
                                                        statusFilter?.value === s.value
                                                            ? statusFilter.mode === 'include' ? 'filled' : 'outline'
                                                            : 'light'
                                                    }
                                                    color={
                                                        statusFilter?.value === s.value && statusFilter.mode === 'exclude'
                                                            ? 'red'
                                                            : 'gray'
                                                    }
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => toggleFilter(statusFilter, setStatusFilter, s.value)}
                                                >
                                                    {statusFilter?.value === s.value && statusFilter.mode === 'exclude' && '✕ '}
                                                    {s.label}
                                                </Badge>
                                            </Tooltip>
                                        ))}
                                    </Group>
                                </Stack>

                                <Stack gap={4}>
                                    <Text size="xs" c="dimmed" fw={600}>Commitment</Text>
                                    <Group gap={4}>
                                        {commitmentStatuses.map((s) => (
                                            <Tooltip
                                                key={s.value}
                                                label={
                                                    typeFilter?.value === s.value
                                                        ? typeFilter.mode === 'include'
                                                            ? 'Filtering by this — click to exclude'
                                                            : 'Excluding this — click to clear'
                                                        : 'Click to filter'
                                                }
                                            >
                                                <Badge
                                                    size="sm"
                                                    variant={
                                                        typeFilter?.value === s.value
                                                            ? typeFilter.mode === 'include' ? 'filled' : 'outline'
                                                            : 'light'
                                                    }
                                                    color={
                                                        typeFilter?.value === s.value && typeFilter.mode === 'exclude'
                                                            ? 'red'
                                                            : 'gray'
                                                    }
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => toggleFilter(typeFilter, setTypeFilter, s.value)}
                                                >
                                                    {typeFilter?.value === s.value && typeFilter.mode === 'exclude' && '✕ '}
                                                    {s.label}
                                                </Badge>
                                            </Tooltip>
                                        ))}
                                    </Group>
                                </Stack>

                                <Divider />

                                <ScrollArea h={200}>
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

                                {totalPages > 1 && (
                                    <Group justify="center" gap="xs">
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
                                )}
                            </Stack>
                        </Box>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}

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
    Skeleton
} from "@mantine/core";
import { BarChart } from '@mantine/charts';
import { useState, useEffect, use } from 'react';
import { IconArrowLeft, IconMail, IconPhone, IconBrandDiscord, IconCalendar, IconNote } from '@tabler/icons-react';
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

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [contact, setContact] = useState<Contact | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);

    useEffect(() => {
        fetchContactDetails();
        fetchAcceptanceRate();
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

                {/* Placeholder for future content */}
            </Grid>
        </Stack>
    );
}

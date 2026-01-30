'use client';

import {
    Title,
    Text,
    Stack,
    Paper,
    Button,
    Group,
    Grid,
    Badge,
    Divider,
    SimpleGrid,
    Skeleton,
} from "@mantine/core";
import { useState, useEffect, use } from 'react';
import { IconArrowLeft, IconMail, IconPhone, IconBrandDiscord, IconCalendar, IconNote } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import EventHistory from './EventHistory';
import OpenedTickets from './OpenedTickets';

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

function ContactField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Group gap="sm">
            {icon}
            <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                <Text>{value}</Text>
            </div>
        </Group>
    );
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContactDetails();
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
                            {[
                                { icon: <IconBrandDiscord size={20} style={{ color: '#5865F2' }} />, label: 'Discord ID', value: contact?.discord_id },
                                { icon: <IconMail size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />, label: 'Email', value: contact?.email },
                                { icon: <IconPhone size={20} style={{ color: 'var(--mantine-color-green-6)' }} />, label: 'Phone', value: contact?.phone },
                                { icon: <IconCalendar size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />, label: 'Added', value: contact?.created_at ? formatDate(contact.created_at) : undefined },
                            ].flatMap((field, i, arr) => [
                                <ContactField key={field.label} icon={field.icon} label={field.label} value={field.value || '—'} />,
                                ...(i < arr.length - 1 ? [<Divider key={`d-${i}`} />] : []),
                            ])}
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
                {/* This chart has been depreciated. Remove this after the Ticket Asks*/}

                <EventHistory contactId={id} />
                <OpenedTickets contactId={id} />
            </Grid>
        </Stack>
    );
}

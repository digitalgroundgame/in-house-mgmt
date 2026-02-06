"use client";

import { Stack, TextInput, Paper, Text, Group, Button, Badge, Box, Divider } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconSearch } from "@tabler/icons-react";
import { apiClient } from "@/app/lib/apiClient";

// TODO: Move to its own file
export interface Contact {
  id: number;
  discord_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface VolunteerResponse {
  id: number;
  rid: number;
  did: string;
  response: number;
}

interface ContactSearchProps {
  reachId: number;
}

export default function ContactSearch({ reachId }: ContactSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [responses, setResponses] = useState<Map<string, VolunteerResponse>>(new Map());
  const [loading, setLoading] = useState(false);

  // Fetch existing responses for this reach
  useEffect(() => {
    fetchResponses();
  }, [reachId]);

  const fetchResponses = async () => {
    try {
      // TODO: Replace with /api/tickets/<id>/audit?...
      const data = await apiClient.get<VolunteerResponse[]>(
        `/volunteer-responses/by-reach/${reachId}/`
      );

      const responsesMap = new Map<string, VolunteerResponse>();
      data.forEach((resp: VolunteerResponse) => {
        responsesMap.set(resp.did, resp);
      });
      setResponses(responsesMap);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.get<{ results?: Contact[] }>(
        `/contacts/?q=${encodeURIComponent(query)}`
      );
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetResponse = async (contact: Contact, responseValue: number) => {
    const existingResponse = responses.get(contact.discord_id);

    try {
      if (existingResponse && existingResponse.did && existingResponse.rid === reachId) {
        // Update existing response using composite key
        const data = await apiClient.patch<VolunteerResponse>(
          "/volunteer-responses/update-by-keys/",
          {
            rid: reachId,
            did: contact.discord_id,
            response: responseValue,
          }
        );

        // Update local state
        const newResponses = new Map(responses);
        newResponses.set(contact.discord_id, data);
        setResponses(newResponses);
      } else {
        // Create new response
        const payload = {
          rid: reachId,
          did: contact.discord_id,
          response: responseValue,
        };
        console.log("Creating response with payload:", payload);

        const data = await apiClient.post<VolunteerResponse>("/volunteer-responses/", payload);
        console.log("Data:", data);

        // Update local state
        const newResponses = new Map(responses);
        newResponses.set(contact.discord_id, data);
        setResponses(newResponses);
      }
    } catch (error) {
      console.error("Error setting response:", error);
    }
  };

  const getResponseBadge = (contact: Contact) => {
    const response = responses.get(contact.discord_id);
    if (!response) return null;

    if (response.response === 1) {
      return <Badge color="green">Accepted</Badge>;
    } else if (response.response === 2) {
      return <Badge color="red">Rejected</Badge>;
    }
    return null;
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Text size="sm" fw={500}>
          Contact Responses To Reach
        </Text>

        <TextInput
          placeholder="Search contacts by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          leftSection={<IconSearch size={16} />}
        />

        {searchResults.length > 0 && (
          <Stack gap="xs">
            {searchResults.map((contact) => {
              const currentResponse = responses.get(contact.discord_id);
              return (
                <Paper key={contact.discord_id} p="sm" withBorder bg="gray.0">
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {contact.full_name}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {contact.email || contact.discord_id}
                      </Text>
                    </Box>

                    <Group gap="xs" wrap="nowrap">
                      {getResponseBadge(contact)}
                      <Button
                        size="xs"
                        color="green"
                        variant={currentResponse?.response === 1 ? "filled" : "light"}
                        onClick={() => handleSetResponse(contact, 1)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant={currentResponse?.response === 0 ? "filled" : "light"}
                        onClick={() => handleSetResponse(contact, 0)}
                      >
                        Reject
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

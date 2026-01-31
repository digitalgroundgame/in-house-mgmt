import { Event, getStatusColor } from "@/app/components/event-utils";
import {
  Text,
  Paper,
  Container,
  Stack,
  Divider,
  Title,
  Grid,
  GridCol,
  Box,
  Badge,
} from "@mantine/core";

export default function EventView({ event }: { event: Event }) {
  return (
    <Container py="xl" size="xl">
      <Grid>
        <GridCol span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md">
            <Stack gap="sm">
              <Title>{event.name}</Title>
              <Divider />
              <Text>{event.description}</Text>
            </Stack>
          </Paper>
        </GridCol>
        <GridCol span={{ base: 12, md: 4 }}>
          <Paper withBorder p="sm">
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                Ticket Status
              </Text>
              <Badge color={getStatusColor(event.status_display)}>{event.status_display}</Badge>
            </Box>
            <Divider />
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                Location Name
              </Text>
              <Text>{event.location_name}</Text>
            </Box>
            <Divider />
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                Address
              </Text>
              <Text mb={4}>{event.location_address}</Text>
            </Box>
            <Divider />
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                Location Display
              </Text>
              <Text>{event.location_display}</Text>
            </Box>
            <Divider />
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                Start Date
              </Text>
              <Text>{event.starts_at}</Text>
            </Box>
            <Divider />
            <Box mt={4} mb={4}>
              <Text c="dimmed" size="sm">
                End Date
              </Text>
              <Text>{event.ends_at}</Text>
            </Box>
          </Paper>
        </GridCol>
      </Grid>
    </Container>
  );
}

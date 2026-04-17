import { Container, Title, Paper, Text, Stack, Group, ThemeIcon, Anchor } from "@mantine/core";

const steps: (string | React.ReactNode)[] = [
  <>
    Go to the <Anchor href="/events">Events tab</Anchor>
  </>,
  "Click on Add Event",
  "Fill out your event details and press Submit",
  "Select your new event",
  "Click the Add Participant button",
  "Search for participants by Discord server name",
  'Set Participant Status to "Attended"',
  "You're done! Thank you!",
];

export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">
        Steps to Manage an Event
      </Title>
      <Paper p="xl" withBorder radius="md">
        <Stack gap="md">
          {steps.map((step, i) => (
            <Group key={i} gap="md" wrap="nowrap" align="flex-start">
              <ThemeIcon size="lg" radius="xl" variant="light">
                <Text size="sm" fw={700}>
                  {i + 1}
                </Text>
              </ThemeIcon>
              <Text size="md" pt={4}>
                {step}
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}

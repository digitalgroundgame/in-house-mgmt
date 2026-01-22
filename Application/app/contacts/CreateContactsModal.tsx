import { Button, Group, Modal, MultiSelect, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Component, JSX, useState } from "react";
import { createUser } from "./actions";
import { Tag } from "../components/ContactTable";

export default function AddContactModal({
  opened,
  setOpened,
  tags,
}: {
  opened: boolean,
  setOpened: Function,
  tags: Tag[]
}): React.ReactElement {
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
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title="Add New Contact"
      size="md"
    >
      <form
        onSubmit={form.onSubmit(async (values) => {
          await createUser(values);
          setOpened(false);
          form.reset();
        })}
      >
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
            <Button variant="outline" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Contact
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
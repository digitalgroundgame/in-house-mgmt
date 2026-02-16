"use client";

import { useState, useMemo } from "react";
import { DateTimePicker as MantineDateTimePicker } from "@mantine/dates";
import { Stack, Group, Text, Popover, Button, Box } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import { toUTC, parseToLocal, getTimezoneAbbr, formatDateTime } from "@/app/utils/datetime";

export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

export interface DateRangePickerProps {
  /** Current value with start/end UTC strings */
  value: DateRangeValue;
  /** Callback with UTC datetime strings */
  onChange: (value: DateRangeValue) => void;
  /** Label for the field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Error message */
  error?: string;
}

export function DateRangePicker({
  value,
  onChange,
  label,
  placeholder = "Select date range",
  required,
  error,
}: DateRangePickerProps) {
  const { timezone } = useTimezone();
  const [opened, setOpened] = useState(false);

  // Compute local Date values from UTC strings
  // const localStart = useMemo(() => parseToLocal(value.start, timezone), [value.start, timezone]);
  // const localEnd = useMemo(() => parseToLocal(value.end, timezone), [value.end, timezone]);

  // Local draft state for when popover is open
  const [draftStart, setDraftStart] = useState<string | null>(value.start);
  const [draftEnd, setDraftEnd] = useState<string | null>(value.end);

  // Reset draft when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDraftStart(value.start);
      setDraftEnd(value.end);
    }
    setOpened(isOpen);
  };

  const handleApply = () => {
    onChange({
      start: draftStart,
      end: draftEnd,
    });
    setOpened(false);
  };

  const handleClear = () => {
    setDraftStart(null);
    setDraftEnd(null);
    onChange({ start: null, end: null });
    setOpened(false);
  };

  // Format display text
  const getDisplayText = () => {
    if (!value.start && !value.end) return placeholder;
    const startText = formatDateTime(value.start, timezone, {
      includeTime: true,
      style: "short",
    });
    const endText = formatDateTime(value.end, timezone, {
      includeTime: true,
      style: "short",
    });
    return `${startText} - ${endText}`;
  };

  const tzAbbr = getTimezoneAbbr(timezone);

  return (
    <Box>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label} ({tzAbbr})
          {required && <span style={{ color: "var(--mantine-color-red-6)" }}> *</span>}
        </Text>
      )}
      <Popover opened={opened} onChange={handleOpenChange} position="bottom-start" width={360}>
        <Popover.Target>
          <Button
            variant="default"
            onClick={() => handleOpenChange(!opened)}
            leftSection={<IconCalendar size={16} />}
            styles={{
              root: {
                fontWeight: 400,
                color: value.start || value.end ? undefined : "var(--mantine-color-dimmed)",
              },
              inner: {
                justifyContent: "flex-start",
              },
            }}
            fullWidth
          >
            {getDisplayText()}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="md">
            <MantineDateTimePicker
              label={`Start (${tzAbbr})`}
              value={draftStart}
              onChange={setDraftStart}
              clearable
            />
            <MantineDateTimePicker
              label={`End (${tzAbbr})`}
              value={draftEnd}
              onChange={setDraftEnd}
              minDate={draftStart || undefined}
              clearable
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="subtle" size="xs" onClick={handleClear}>
                Clear
              </Button>
              <Button size="xs" onClick={handleApply}>
                Apply
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
    </Box>
  );
}

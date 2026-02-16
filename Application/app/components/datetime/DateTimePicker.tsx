"use client";

import { DateTimePicker as MantineDateTimePicker } from "@mantine/dates";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import { toUTC, parseToLocal, getTimezoneAbbr } from "@/app/utils/datetime";
import { ComponentProps } from "react";

type MantineDateTimePickerProps = ComponentProps<typeof MantineDateTimePicker>;

export interface DateTimePickerProps extends Omit<
  MantineDateTimePickerProps,
  "value" | "onChange"
> {
  /** UTC datetime string */
  value: string | null | undefined;
  /** Callback with UTC datetime string */
  onChange: (utcValue: string | null) => void;
  /** Show timezone abbreviation in label (default: true) */
  showTimezone?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  showTimezone = true,
  ...props
}: DateTimePickerProps) {
  const { timezone } = useTimezone();

  // Parse UTC string to local Date for the picker
  const localValue = parseToLocal(value, timezone);

  // Convert local Date back to UTC string for the callback
  const handleChange = (date: string | null) => {
    if (!date) {
      onChange(null);
      return;
    }
    onChange(toUTC(new Date(date), timezone));
  };

  // Append timezone abbreviation to label if desired
  const displayLabel = showTimezone && label ? `${label} (${getTimezoneAbbr(timezone)})` : label;

  return (
    <MantineDateTimePicker
      value={localValue}
      onChange={handleChange}
      label={displayLabel}
      {...props}
    />
  );
}

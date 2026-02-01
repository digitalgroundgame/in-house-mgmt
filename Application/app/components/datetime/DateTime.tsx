"use client";

import { Text, Tooltip, TextProps } from "@mantine/core";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import { formatDateTime, formatFullDateTime, FormatDateTimeOptions } from "@/app/utils/datetime";

export interface DateTimeProps extends Omit<TextProps, "children"> {
  /** UTC datetime string */
  value: string | null | undefined;
  /** Include time in output (default: true) */
  includeTime?: boolean;
  /** Format style: 'short', 'medium', 'long' (default: 'medium') */
  style?: FormatDateTimeOptions["style"];
  /** Show tooltip with full datetime (default: true) */
  showTooltip?: boolean;
}

export function DateTime({
  value,
  includeTime = true,
  style = "medium",
  showTooltip = true,
  ...textProps
}: DateTimeProps) {
  const { timezone } = useTimezone();

  const displayText = formatDateTime(value, timezone, { includeTime, style });
  const tooltipText = formatFullDateTime(value, timezone);

  if (!showTooltip || !value) {
    return <Text {...textProps}>{displayText}</Text>;
  }

  return (
    <Tooltip label={tooltipText} withArrow>
      <Text {...textProps}>{displayText}</Text>
    </Tooltip>
  );
}

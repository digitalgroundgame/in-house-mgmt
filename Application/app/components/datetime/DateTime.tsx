"use client";

import { Text, Tooltip, TextProps } from "@mantine/core";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import {
  formatDateTime,
  formatFullDateTime,
  getTimezoneAbbr,
  FormatDateTimeOptions,
} from "@/app/utils/datetime";

export interface DateTimeProps extends Omit<TextProps, "children"> {
  /** UTC datetime string */
  value: string | null | undefined;
  /** Include time in output (default: true) */
  includeTime?: boolean;
  /** Format style: 'short', 'medium', 'long' (default: 'medium') */
  format?: FormatDateTimeOptions["style"];
  /** Show tooltip with full datetime (default: true) */
  showTooltip?: boolean;
  /** Show timezone abbreviation (default: true) */
  showTimezone?: boolean;
}

export function DateTime({
  value,
  includeTime = true,
  format = "medium",
  showTooltip = true,
  showTimezone = true,
  ...textProps
}: DateTimeProps) {
  const { timezone } = useTimezone();

  const formattedDate = formatDateTime(value, timezone, { includeTime, style: format });
  const tzAbbr = getTimezoneAbbr(timezone);
  // Only show timezone when time is displayed
  const displayText =
    showTimezone && includeTime && value ? `${formattedDate} ${tzAbbr}` : formattedDate;
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

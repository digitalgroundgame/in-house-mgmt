"use client";

import { Text, Tooltip, TextProps } from "@mantine/core";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import {
  formatDateTime,
  formatFullDateTime,
  getTimezoneAbbr,
  FormatDateTimeOptions,
} from "@/app/utils/datetime";

export interface DateRangeProps extends Omit<TextProps, "children"> {
  /** Start datetime (UTC string) */
  start: string | null | undefined;
  /** End datetime (UTC string) */
  end: string | null | undefined;
  /** Include time in output (default: false for ranges) */
  includeTime?: boolean;
  /** Separator between dates (default: ' - ') */
  separator?: string;
  /** Show tooltip with full datetime (default: true) */
  showTooltip?: boolean;
  /** Show timezone abbreviation (default: true) */
  showTimezone?: boolean;
}

export function DateRange({
  start,
  end,
  includeTime = false,
  separator = " - ",
  showTooltip = true,
  showTimezone = true,
  ...textProps
}: DateRangeProps) {
  const { timezone } = useTimezone();

  const startText = formatDateTime(start, timezone, {
    includeTime,
  });
  const endText = formatDateTime(end, timezone, {
    includeTime,
  });

  const tzAbbr = getTimezoneAbbr(timezone);

  const displayText =
    showTimezone && includeTime && (start || end)
      ? `${startText}${separator}${endText} ${tzAbbr}`
      : `${startText}${separator}${endText}`;

  const tooltipLines = [
    `Start: ${formatFullDateTime(start, timezone)}`,
    `End: ${formatFullDateTime(end, timezone)}`,
  ].join("\n");

  if (!showTooltip || (!start && !end)) {
    return <Text {...textProps}>{displayText}</Text>;
  }

  return (
    <Tooltip label={tooltipLines} withArrow multiline style={{ whiteSpace: "pre-line" }}>
      <Text {...textProps}>{displayText}</Text>
    </Tooltip>
  );
}

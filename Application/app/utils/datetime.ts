import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

export { dayjs };

export interface FormatDateTimeOptions {
  /** Include time in output (default: true) */
  includeTime?: boolean;
  /** Format style: 'short', 'medium', 'long' (default: 'medium') */
  /** Show relative time instead (e.g., "3 hours ago") */
  relative?: boolean;
}

/**
 * Format a UTC datetime string for display in the user's timezone
 */
export function formatDateTime(
  utcString: string | null | undefined,
  tz: string = getBrowserTimezone(),
  options: FormatDateTimeOptions = {}
): string {
  if (!utcString) return "No date";

  const { includeTime = true, relative = false } = options;

  const date = dayjs.utc(utcString).tz(tz);

  if (relative) {
    return date.fromNow();
  }

  const fmt = {
    date: "MM/DD/YY",
    time: "hh:mm A",
  };

  if (includeTime) {
    return date.format(`${fmt.date}, ${fmt.time}`);
  }
  return date.format(fmt.date);
}

/**
 * Convert a local Date object to a UTC ISO string for API submission
 */
export function toUTC(date: Date | null, tz: string): string | null {
  if (!date) return null;
  return dayjs.tz(date, tz).utc().toISOString();
}

/**
 * Parse a UTC ISO string to a local Date object for form inputs/pickers
 */
export function parseToLocal(utcString: string | null | undefined, tz: string): Date | null {
  if (!utcString) return null;
  return dayjs.utc(utcString).tz(tz).toDate();
}

/**
 * Get the timezone abbreviation for a timezone (e.g., "EST", "PST")
 */
export function getTimezoneAbbr(tz: string): string {
  const date = dayjs().tz(tz);
  return date.format("z");
}

/**
 * Get a formatted full datetime with timezone for tooltips
 */
export function formatFullDateTime(utcString: string | null | undefined, tz: string): string {
  if (!utcString) return "No date";
  const date = dayjs.utc(utcString).tz(tz);
  return `${date.format("dddd, MMMM D, YYYY [at] h:mm A")} ${getTimezoneAbbr(tz)}`;
}

/**
 * Get the relative time (e.g., "3 hours ago")
 */
export function getRelativeTime(utcString: string | null | undefined): string {
  if (!utcString) return "";
  return dayjs.utc(utcString).fromNow();
}

// Common US timezones to prioritize in the list
const PRIORITIZED_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

/**
 * Get list of all available timezones, with common US timezones first
 */
export function getTimezoneList(): { value: string; label: string }[] {
  try {
    const allTimezones = Intl.supportedValuesOf("timeZone");

    // Create labels with UTC offset
    const createLabel = (tz: string): string => {
      const offset = dayjs().tz(tz).format("Z");
      // Clean up timezone name for display
      const displayName = tz.replace(/_/g, " ").replace(/\//g, " / ");
      return `(UTC${offset}) ${displayName}`;
    };

    // Prioritized timezones first
    const prioritized = PRIORITIZED_TIMEZONES.filter((tz) => allTimezones.includes(tz)).map(
      (tz) => ({
        value: tz,
        label: createLabel(tz),
      })
    );

    // Rest of timezones, sorted alphabetically
    const rest = allTimezones
      .filter((tz) => !PRIORITIZED_TIMEZONES.includes(tz))
      .sort()
      .map((tz) => ({
        value: tz,
        label: createLabel(tz),
      }));

    return [...prioritized, ...rest];
  } catch {
    // Fallback if Intl.supportedValuesOf is not available
    return PRIORITIZED_TIMEZONES.map((tz) => ({ value: tz, label: tz }));
  }
}

/**
 * Detect the browser's timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

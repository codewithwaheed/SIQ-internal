/**
 * Auto-appends units to values based on field name patterns
 */
const UNIT_MAP: Record<string, string> = {
  _minutes: " minutes",
  _hours: " hours",
  _days: " days",
  _mb: " MB",
  _gb: " GB",
  _per_day: " per day",
  _time_limit: " minutes",
  _timeout: " minutes",
  _duration: " minutes",
  _period: " days",
  _frequency: " days",
  _count: "",
  _threshold: "",
  _length: " characters",
};

/**
 * Formats a value with appropriate units based on field key
 */
export function formatValue(key: string, value: string | number): string {
  const val = String(value).trim();
  if (!val || val === "undefined" || val === "null") return "";

  // Check for exact matches first
  for (const suffix in UNIT_MAP) {
    if (key.endsWith(suffix)) {
      const unit = UNIT_MAP[suffix];
      // Don't double-add units if they're already there
      if (unit && !val.includes(unit.trim())) {
        return `${val}${unit}`;
      }
      return val;
    }
  }

  // Special cases for common field patterns
  if (key.includes("password") && key.includes("length")) {
    return val.includes("character") ? val : `${val} characters`;
  }

  if (key.includes("lockout") && key.includes("duration")) {
    return val.includes("minute") ? val : `${val} minutes`;
  }

  if (key.includes("expiry") || key.includes("rotation")) {
    return val.includes("day") ? val : `${val} days`;
  }

  return val;
}

/**
 * Smart formatting for boolean-like values
 */
export function formatBoolean(value: string): string {
  const normalized = value.toLowerCase().trim();
  if (normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  if (normalized === "no" || normalized === "false" || normalized === "0") {
    return "No";
  }
  return value; // Return as-is if not clearly boolean
}

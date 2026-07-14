// Safe message interpolation for dictionary strings.
//
// Placeholders are written as `{name}` and replaced with caller-supplied
// values coerced to plain text. Translations are never evaluated, parsed as
// HTML/Markdown, or rendered with dangerouslySetInnerHTML — React escapes the
// resulting string like any other text node, so a `<script>` inside a Job
// title stays literal on every surface.

export type MessageValues = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Replaces `{name}` placeholders with the matching value, treating every value
 * as text. Unknown placeholders are left literally in place (a safe, visible
 * fallback that dictionary parity tests catch in development) rather than
 * throwing at render time.
 */
export function formatMessage(
  template: string,
  values: MessageValues = {},
): string {
  return template.replace(PLACEHOLDER_PATTERN, (token, name: string) => {
    const value = values[name];
    if (value === undefined || value === null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`i18n: missing value for placeholder {${name}}`);
      }
      return token;
    }
    return String(value);
  });
}

/** Returns the sorted unique `{placeholder}` names used in a template. */
export function extractPlaceholders(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

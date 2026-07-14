import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogValue = boolean | number | string | null | undefined;

const SENSITIVE_KEY =
  /authorization|cookie|secret|token|password|database|url|email|recipient|body|note|meeting|document|session/i;
const SAFE_STRING = /^[A-Za-z0-9_.:-]{1,128}$/;

export function redactLogMetadata(
  metadata: Record<string, LogValue>,
): Record<string, boolean | number | string | null> {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (value === undefined) return [];
      if (SENSITIVE_KEY.test(key)) return [[key, "[REDACTED]"]];
      if (typeof value === "string" && !SAFE_STRING.test(value)) {
        return [[key, "[REDACTED]"]];
      }
      return [[key, value]];
    }),
  );
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  metadata: Record<string, LogValue> = {},
): void {
  const diagnostic = {
    event: SAFE_STRING.test(event) ? event : "server.event",
    ...redactLogMetadata(metadata),
  };
  console[level]("[careerbridge]", diagnostic);
}

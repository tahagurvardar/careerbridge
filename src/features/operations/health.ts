import "server-only";

export type ReadinessProbe = () => Promise<unknown>;

const RESPONSE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  "content-type": "application/json; charset=utf-8",
} as const;

export async function runReadinessCheck(
  probe: ReadinessProbe,
  timeoutMs = 2_000,
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("READINESS_TIMEOUT")),
          timeoutMs,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createHealthHandler(
  probe: ReadinessProbe,
  options: { timeoutMs?: number } = {},
): () => Promise<Response> {
  return async () => {
    const healthy = await runReadinessCheck(probe, options.timeoutMs);
    return Response.json(
      { status: healthy ? "ok" : "unavailable" },
      {
        status: healthy ? 200 : 503,
        headers: RESPONSE_HEADERS,
      },
    );
  };
}

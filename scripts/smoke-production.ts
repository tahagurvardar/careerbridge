const supportedLocales = ["en", "tr", "az", "ru"] as const;
export {};

async function main(): Promise<void> {
  const baseInput = process.argv[2] ?? process.env.SMOKE_TEST_BASE_URL;

  if (!baseInput) {
    throw new Error(
      "Production smoke checks require a deployment URL argument or SMOKE_TEST_BASE_URL.",
    );
  }

  const baseURL = new URL(baseInput);
  if (baseURL.protocol !== "https:") {
    throw new Error("Production smoke checks require an HTTPS origin.");
  }
  baseURL.pathname = "/";
  baseURL.search = "";
  baseURL.hash = "";

  async function request(path: string, redirect: RequestRedirect = "follow") {
    return fetch(new URL(path, baseURL), {
      redirect,
      headers: { "user-agent": "CareerBridge-Production-Smoke/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
  }

  function assertStatus(response: Response, path: string, expected: number[]) {
    if (!expected.includes(response.status)) {
      throw new Error(
        `Smoke check failed for ${path}: HTTP ${response.status}.`,
      );
    }
  }

  const root = await request("/", "manual");
  assertStatus(root, "/", [307, 308]);
  const redirectLocation = root.headers.get("location");
  if (
    !redirectLocation ||
    !supportedLocales.some(
      (locale) =>
        redirectLocation === `/${locale}` ||
        redirectLocation.startsWith(`/${locale}?`) ||
        redirectLocation.startsWith(`${baseURL.origin}/${locale}`),
    )
  ) {
    throw new Error("Root did not redirect to a supported locale.");
  }
  console.info("Smoke: root locale redirect passed.");

  for (const locale of supportedLocales) {
    const response = await request(`/${locale}`);
    assertStatus(response, `/${locale}`, [200]);
  }
  console.info("Smoke: all four locale roots passed.");

  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await request(path);
    assertStatus(response, path, [200]);
  }
  console.info("Smoke: robots and sitemap passed.");

  const health = await request("/api/health");
  assertStatus(health, "/api/health", [200]);
  const healthBody = (await health.json()) as { status?: unknown };
  if (healthBody.status !== "ok") {
    throw new Error("Health endpoint did not return the public ready state.");
  }
  console.info("Smoke: health readiness passed.");

  const headers = await request("/en");
  for (const name of [
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "x-frame-options",
    "strict-transport-security",
  ]) {
    if (!headers.headers.has(name)) {
      throw new Error(`Required security header is missing: ${name}.`);
    }
  }
  console.info("Smoke: production security headers passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

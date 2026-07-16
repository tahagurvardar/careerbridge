const expectedBypassSecret = process.env.SMOKE_TEST_EXPECTED_BYPASS_SECRET;
const expectNoBypass = process.env.SMOKE_TEST_EXPECT_NO_BYPASS === "true";
const failRequest = process.env.SMOKE_TEST_FAIL_REQUEST === "true";

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=()",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=31536000",
};

globalThis.fetch = async function smokeProductionFetchMock(input, init = {}) {
  const headers = new Headers(init.headers);
  if (headers.get("user-agent") !== "CareerBridge-Production-Smoke/1.0") {
    throw new Error("Smoke request did not preserve the expected User-Agent.");
  }

  const bypassHeader = headers.get("x-vercel-protection-bypass");
  if (
    expectedBypassSecret !== undefined &&
    bypassHeader !== expectedBypassSecret
  ) {
    throw new Error(
      "Smoke request did not include the expected bypass header.",
    );
  }
  if (expectNoBypass && bypassHeader !== null) {
    throw new Error("Smoke request unexpectedly included a bypass header.");
  }
  if (failRequest) {
    throw new Error("Simulated smoke request failure.");
  }

  const url = new URL(input instanceof Request ? input.url : input);
  if (url.pathname === "/") {
    return new Response(null, {
      status: 307,
      headers: { location: "/en" },
    });
  }

  if (["/en", "/tr", "/az", "/ru"].includes(url.pathname)) {
    return new Response("ok", { status: 200, headers: securityHeaders });
  }

  if (["/robots.txt", "/sitemap.xml"].includes(url.pathname)) {
    return new Response("ok", { status: 200 });
  }

  if (url.pathname === "/api/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  throw new Error(`Unexpected smoke-test path: ${url.pathname}`);
};

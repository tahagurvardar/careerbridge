import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildAbsoluteEmailDestination } from "@/features/email/config";
import {
  createLogEmailProvider,
  createResendEmailProvider,
  EmailProviderFailure,
  getEmailDeliveryProvider,
  sanitizeProviderFailure,
} from "@/features/email/server/provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const message = {
  to: "recipient@example.test",
  subject: "Example",
  text: "Plain text",
  html: "<p>HTML</p>",
  idempotencyKey: "event:one:user",
};

describe("email provider configuration", () => {
  it("uses a non-network log driver outside production without private logs", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const provider = createLogEmailProvider();
    const result = await provider.send(message);
    expect(result.provider).toBe("log");
    expect(info).toHaveBeenCalledWith("Email delivery simulated.");
    expect(JSON.stringify(info.mock.calls)).not.toContain(message.to);
    expect(JSON.stringify(info.mock.calls)).not.toContain(message.subject);
  });

  it("forbids log delivery and unknown drivers in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DELIVERY_DRIVER", "log");
    expect(() => getEmailDeliveryProvider()).toThrow(EmailProviderFailure);
    vi.stubEnv("EMAIL_DELIVERY_DRIVER", "unknown");
    expect(() => getEmailDeliveryProvider()).toThrow(EmailProviderFailure);
  });

  it("sends through the documented Resend HTTP contract with idempotency", async () => {
    vi.stubEnv("EMAIL_RESEND_API_KEY", "placeholder-key");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "no-reply@example.test");
    vi.stubEnv("EMAIL_FROM_NAME", "CareerBridge");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "provider-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await createResendEmailProvider(fetchMock).send(message);
    expect(result).toEqual({
      provider: "resend",
      providerMessageId: "provider-message",
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      message.idempotencyKey,
    );
  });

  it("classifies stable temporary and permanent failures without raw bodies", async () => {
    vi.stubEnv("EMAIL_RESEND_API_KEY", "placeholder-key");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "no-reply@example.test");
    const retrying = createResendEmailProvider(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("private", { status: 503 })),
    );
    await expect(retrying.send(message)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
    const permanent = createResendEmailProvider(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("private", { status: 422 })),
    );
    await expect(permanent.send(message)).rejects.toMatchObject({
      code: "PROVIDER_REJECTED_422",
      retryable: false,
    });
    expect(sanitizeProviderFailure(new Error("secret detail"))).toEqual({
      code: "PROVIDER_EXCEPTION",
      retryable: true,
    });
  });

  it("requires HTTPS outside localhost and in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_APP_BASE_URL", "http://localhost:3000");
    expect(buildAbsoluteEmailDestination("/notifications")).toBe(
      "http://localhost:3000/notifications",
    );
    vi.stubEnv("EMAIL_APP_BASE_URL", "http://careerbridge.example");
    expect(() => buildAbsoluteEmailDestination("/notifications")).toThrow(
      "EMAIL_CONFIG_HTTPS_REQUIRED",
    );
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_APP_BASE_URL", "http://localhost:3000");
    expect(() => buildAbsoluteEmailDestination("/notifications")).toThrow(
      "EMAIL_CONFIG_HTTPS_REQUIRED",
    );
  });
});

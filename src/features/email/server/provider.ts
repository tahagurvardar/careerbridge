import "server-only";

import { randomUUID } from "node:crypto";

export type EmailProviderMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type EmailProviderResult = {
  provider: string;
  providerMessageId: string | null;
};

export interface EmailDeliveryProvider {
  readonly name: string;
  send(message: EmailProviderMessage): Promise<EmailProviderResult>;
}

export class EmailProviderFailure extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super("Email provider request failed.");
    this.name = "EmailProviderFailure";
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new EmailProviderFailure("PROVIDER_CONFIG_MISSING", false);
  return value;
}

function formatSender(): string {
  const address = required("EMAIL_FROM_ADDRESS");
  const name = (process.env.EMAIL_FROM_NAME ?? "CareerBridge").trim();
  return name ? `${name.replaceAll(/[<>\r\n]/g, "")} <${address}>` : address;
}

export function createLogEmailProvider(): EmailDeliveryProvider {
  if (process.env.NODE_ENV === "production") {
    throw new EmailProviderFailure("LOG_DRIVER_FORBIDDEN", false);
  }
  return {
    name: "log",
    async send() {
      console.info("Email delivery simulated.");
      return {
        provider: "log",
        providerMessageId: `simulated-${randomUUID()}`,
      };
    },
  };
}

export function createResendEmailProvider(
  fetchImplementation: typeof fetch = fetch,
): EmailDeliveryProvider {
  return {
    name: "resend",
    async send(message) {
      const apiKey = required("EMAIL_RESEND_API_KEY");
      const payload: Record<string, unknown> = {
        from: formatSender(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      };
      const replyTo = process.env.EMAIL_REPLY_TO?.trim();
      if (replyTo) payload.reply_to = replyTo;

      let response: Response;
      try {
        response = await fetchImplementation("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": message.idempotencyKey,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new EmailProviderFailure("PROVIDER_NETWORK", true);
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new EmailProviderFailure("PROVIDER_RATE_LIMITED", true);
        }
        if (response.status >= 500) {
          throw new EmailProviderFailure("PROVIDER_UNAVAILABLE", true);
        }
        throw new EmailProviderFailure(
          `PROVIDER_REJECTED_${response.status}`,
          false,
        );
      }

      let messageId: string | null = null;
      try {
        const responseBody = (await response.json()) as { id?: unknown };
        if (typeof responseBody.id === "string") {
          messageId = responseBody.id.slice(0, 255);
        }
      } catch {
        // A successful response without usable JSON is still accepted. The
        // provider message id is optional and no raw response is retained.
      }
      return { provider: "resend", providerMessageId: messageId };
    },
  };
}

export function getEmailDeliveryProvider(): EmailDeliveryProvider {
  const driver = (process.env.EMAIL_DELIVERY_DRIVER ?? "log").trim();
  if (process.env.NODE_ENV === "production" && driver !== "resend") {
    throw new EmailProviderFailure("PRODUCTION_DRIVER_REQUIRED", false);
  }
  if (driver === "log") return createLogEmailProvider();
  if (driver === "resend") return createResendEmailProvider();
  throw new EmailProviderFailure("UNKNOWN_EMAIL_DRIVER", false);
}

export function sanitizeProviderFailure(error: unknown): {
  code: string;
  retryable: boolean;
} {
  if (error instanceof EmailProviderFailure) {
    return { code: error.code.slice(0, 120), retryable: error.retryable };
  }
  return { code: "PROVIDER_EXCEPTION", retryable: true };
}

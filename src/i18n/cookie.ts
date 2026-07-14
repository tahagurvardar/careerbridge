// Locale cookie contract. The cookie stores only a supported lowercase route
// code — never a user id, email, role, or session value — and is written
// server-side by the dedicated locale action. Reads always re-validate the
// value, so a tampered cookie safely collapses to the fallback tiers.

export const LOCALE_COOKIE_NAME = "cb_locale";

/** One year, in seconds: long-lived but bounded. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function getLocaleCookieOptions() {
  return {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    // The browser never needs to script-read this value (the URL carries the
    // active locale), so keep writes and reads server-controlled.
    httpOnly: true,
  };
}

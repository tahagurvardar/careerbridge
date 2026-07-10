import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

const publicGetPaths = new Set(["/api/auth/get-session"]);
const publicPostPaths = new Set([
  "/api/auth/get-session",
  "/api/auth/sign-in/email",
  "/api/auth/sign-out",
]);

function getPathname(request: Request) {
  return new URL(request.url).pathname.replace(/\/+$/, "");
}

function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export function GET(request: Request) {
  if (!publicGetPaths.has(getPathname(request))) {
    return notFound();
  }

  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request) {
  if (!publicPostPaths.has(getPathname(request))) {
    return notFound();
  }

  return toNextJsHandler(getAuth()).POST(request);
}

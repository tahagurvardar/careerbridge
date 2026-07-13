import { createHash, timingSafeEqual } from "node:crypto";

import { dispatchEmailBatch } from "@/features/email/server/dispatcher";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request): boolean {
  const configured = process.env.EMAIL_DISPATCH_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  return timingSafeEqual(digest(configured), digest(supplied));
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  try {
    return Response.json(await dispatchEmailBatch(getPrismaClient()));
  } catch {
    return Response.json(
      { error: "Email dispatch was not completed." },
      { status: 503 },
    );
  }
}

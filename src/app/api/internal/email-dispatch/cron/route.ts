import { createCronDispatchHandler } from "@/features/email/server/cron";
import { dispatchEmailBatch } from "@/features/email/server/dispatcher";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleCronDispatch = createCronDispatchHandler(() =>
  dispatchEmailBatch(getPrismaClient()),
);

export function GET(request: Request): Promise<Response> {
  return handleCronDispatch(request);
}

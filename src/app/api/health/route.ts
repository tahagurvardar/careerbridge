import { createHealthHandler } from "@/features/operations/health";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleHealth = createHealthHandler(async () => {
  await getPrismaClient().$queryRaw`SELECT 1`;
});

export function GET(): Promise<Response> {
  return handleHealth();
}

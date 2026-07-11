import { getCurrentSession } from "@/features/auth/server/session";
import {
  authorizeDocumentDownload,
  logDocumentDownload,
} from "@/features/candidate-documents/server/mutations";
import { documentIdSchema } from "@/features/candidate-documents/schemas";
import { contentDispositionAttachment } from "@/features/candidate-documents/validation";
import { getPrismaClient } from "@/lib/prisma";
import { DocumentStorageError, getDocumentStorage } from "@/lib/storage";

// Node runtime: the handler uses Prisma, node:crypto (via storage), and streams
// private bytes. Never cached — every request is re-authorized from the session.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DENIAL_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "private, no-store",
} as const;

/**
 * Uniform denial for signed-out, unauthorized, and unknown-document cases so
 * the route never reveals whether a document exists.
 */
function denied(): Response {
  return new Response("Not found", { status: 404, headers: DENIAL_HEADERS });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
): Promise<Response> {
  const { documentId } = await context.params;
  const parsed = documentIdSchema.safeParse(documentId);
  if (!parsed.success) return denied();

  const session = await getCurrentSession();
  if (!session) return denied();
  const actor = { userId: session.user.id, role: session.user.role };

  const prisma = getPrismaClient();
  const authorized = await authorizeDocumentDownload(
    prisma,
    actor,
    parsed.data,
  );
  if (!authorized) return denied();

  let object;
  try {
    object = await getDocumentStorage().getObject(
      authorized.document.storageKey,
    );
  } catch (error) {
    if (error instanceof DocumentStorageError && error.code === "NOT_FOUND") {
      return denied();
    }
    // Never surface storage-provider internals to the client.
    return new Response("Unable to download the document.", {
      status: 500,
      headers: DENIAL_HEADERS,
    });
  }

  // Record the successful, authorized access. Best-effort: an audit write
  // failure must not deny a user their own file.
  try {
    await logDocumentDownload(prisma, {
      documentId: authorized.document.id,
      actorUserId: actor.userId,
      applicationId: authorized.applicationId,
      accessType: authorized.accessType,
    });
  } catch {
    // Intentionally swallowed; downloads remain available if auditing fails.
  }

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": contentDispositionAttachment(
        authorized.document.originalFilename,
      ),
      "content-length": String(object.contentLength),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "referrer-policy": "no-referrer",
    },
  });
}

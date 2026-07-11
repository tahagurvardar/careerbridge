// Upload validation for Candidate resume PDFs. Pure and database-free so the
// full accept/reject matrix is unit tested without any storage or database.
// Nothing here trusts a single signal: MIME type, extension, and magic bytes
// must all agree, and the file must be non-empty and within the size limit.

export const MAX_RESUME_MB = 5;
export const MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024;
export const RESUME_MIME_TYPE = "application/pdf";
export const RESUME_EXTENSION = ".pdf";

// "%PDF-" — the required leading bytes of every PDF document.
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

export type ResumeValidationCode =
  | "MISSING_FILE"
  | "EMPTY_FILE"
  | "TOO_LARGE"
  | "INVALID_TYPE"
  | "INVALID_EXTENSION"
  | "INVALID_SIGNATURE"
  | "INVALID_FILENAME";

export interface ResumeValidationInput {
  size: number;
  mimeType: string;
  filename: string;
  header: Uint8Array;
}

export type ResumeValidationResult =
  { ok: true } | { ok: false; code: ResumeValidationCode; message: string };

// C0 control characters (0x00–0x1F) and DEL (0x7F) are never legal in a
// display filename. Checked numerically to avoid embedding control-byte
// literals in a regular expression.
function isControlCharCode(code: number): boolean {
  return code <= 0x1f || code === 0x7f;
}

function stripControlCharacters(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    if (!isControlCharCode(value.charCodeAt(i))) out += value[i];
  }
  return out;
}

export function hasPdfExtension(filename: string): boolean {
  return filename.trim().toLowerCase().endsWith(RESUME_EXTENSION);
}

export function hasPdfSignature(header: Uint8Array): boolean {
  if (header.length < PDF_MAGIC_BYTES.length) return false;
  return PDF_MAGIC_BYTES.every((byte, index) => header[index] === byte);
}

/**
 * Rejects filenames that carry path components or control characters. The
 * original filename is never used as a storage path, but this keeps traversal
 * and injection sequences out of stored metadata and download headers.
 */
export function isUnsafeFilename(filename: string): boolean {
  if (filename.length === 0) return true;
  for (let i = 0; i < filename.length; i += 1) {
    if (isControlCharCode(filename.charCodeAt(i))) return true;
  }
  if (filename.includes("/") || filename.includes("\\")) return true;
  const trimmed = filename.trim();
  return trimmed === "." || trimmed === "..";
}

function fail(
  code: ResumeValidationCode,
  message: string,
): ResumeValidationResult {
  return { ok: false, code, message };
}

export function validateResumeUpload(
  input: ResumeValidationInput,
): ResumeValidationResult {
  if (!Number.isFinite(input.size)) {
    return fail("MISSING_FILE", "No file was provided.");
  }
  if (input.size <= 0) {
    return fail("EMPTY_FILE", "The selected file is empty.");
  }
  if (input.size > MAX_RESUME_BYTES) {
    return fail(
      "TOO_LARGE",
      `PDF files must be ${MAX_RESUME_MB} MB or smaller.`,
    );
  }
  if (input.mimeType !== RESUME_MIME_TYPE) {
    return fail("INVALID_TYPE", "Only PDF files are accepted.");
  }
  if (isUnsafeFilename(input.filename)) {
    return fail("INVALID_FILENAME", "That filename is not allowed.");
  }
  if (!hasPdfExtension(input.filename)) {
    return fail("INVALID_EXTENSION", "The file must have a .pdf extension.");
  }
  if (!hasPdfSignature(input.header)) {
    return fail("INVALID_SIGNATURE", "The file is not a valid PDF document.");
  }
  return { ok: true };
}

/**
 * Produces a safe display filename for storage metadata and Content-Disposition:
 * strips any path segment, removes control/quoting characters, restricts to a
 * conservative ASCII set, bounds length, and always ends in `.pdf`.
 */
export function sanitizeDocumentFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const cleaned = stripControlCharacters(base).replace(/\s+/g, " ").trim();
  const withoutExtension = cleaned.toLowerCase().endsWith(RESUME_EXTENSION)
    ? cleaned.slice(0, -RESUME_EXTENSION.length)
    : cleaned;
  const safeBase =
    withoutExtension
      .replace(/[^A-Za-z0-9 ._-]/g, "_")
      .replace(/^[._-]+/, "")
      .slice(0, 120)
      .trim() || "resume";
  return `${safeBase}${RESUME_EXTENSION}`;
}

/**
 * Builds a safe `attachment` Content-Disposition value forcing a download.
 * Uses a sanitized ASCII fallback plus an RFC 5987 `filename*` parameter.
 */
export function contentDispositionAttachment(filename: string): string {
  const safe = sanitizeDocumentFilename(filename);
  let asciiFallback = "";
  for (let i = 0; i < safe.length; i += 1) {
    const code = safe.charCodeAt(i);
    const char = safe[i];
    if (code >= 0x20 && code <= 0x7e && char !== '"' && char !== "\\") {
      asciiFallback += char;
    } else {
      asciiFallback += "_";
    }
  }
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

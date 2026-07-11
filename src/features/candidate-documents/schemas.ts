import { z } from "zod";

// Identifier shape used to validate route params and action inputs before any
// database access. A well-formed id that names nothing still resolves to a
// uniform not-found, so this only filters obvious garbage — never authorizes.
export const documentIdSchema = z.string().trim().min(1).max(64);
export const applicationIdSchema = z.string().trim().min(1).max(64);

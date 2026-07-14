import { notFound } from "next/navigation";

// Catch-all for paths that match no route under a valid locale prefix (and
// for unknown two-letter prefixes redirected here as `/en/{prefix}/…`). It
// only ever renders the localized not-found boundary.
export default function CatchAllNotFound() {
  notFound();
}

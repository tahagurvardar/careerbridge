export function normalizeJobSlug(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
    .replace(/-+$/g, "");

  return slug || "job";
}

export function getAvailableJobSlug(
  baseSlug: string,
  existingSlugs: readonly string[],
) {
  const occupied = new Set(existingSlugs);

  if (!occupied.has(baseSlug)) return baseSlug;

  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!occupied.has(candidate)) return candidate;
  }

  throw new Error("Unable to allocate a job slug.");
}

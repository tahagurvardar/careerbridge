export function normalizeCompanySlug(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");

  return slug || "company";
}

export function getAvailableCompanySlug(
  baseSlug: string,
  existingSlugs: readonly string[],
) {
  const occupied = new Set(existingSlugs);

  if (!occupied.has(baseSlug)) return baseSlug;

  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!occupied.has(candidate)) return candidate;
  }

  throw new Error("Unable to allocate a company slug.");
}

export const PUBLICATION_FIELDS = [
  ["name", "Company name"],
  ["description", "Description"],
  ["industry", "Industry"],
  ["headquarters", "Headquarters"],
  ["websiteUrl", "Website"],
] as const;

type PublicationCompany = Record<
  (typeof PUBLICATION_FIELDS)[number][0],
  string | null
>;

export function getCompanyPublicationReadiness(company: PublicationCompany) {
  const missingFields = PUBLICATION_FIELDS.filter(([field]) => {
    const value = company[field];
    return !value || !value.trim();
  }).map(([field, label]) => ({ field, label }));

  return {
    isReady: missingFields.length === 0,
    missingFields,
  };
}

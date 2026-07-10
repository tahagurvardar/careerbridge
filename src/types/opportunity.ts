export type EmploymentType = "Full-time" | "Internship" | "Contract";
export type WorkMode = "Remote" | "Hybrid" | "On-site";

export interface Opportunity {
  slug: string;
  title: string;
  company: string;
  companyInitials: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  compensation: string;
  postedAt: string;
  skills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  featured?: boolean;
}

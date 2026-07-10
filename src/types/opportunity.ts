export type EmploymentType = "Full-time" | "Internship" | "Contract";
export type WorkMode = "Remote" | "Hybrid" | "On-site";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyInitials: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  compensation: string;
  postedAt: string;
  skills: string[];
  featured?: boolean;
}

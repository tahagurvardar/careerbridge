import type { Opportunity } from "@/types/opportunity";

export const mockOpportunities: Opportunity[] = [
  {
    slug: "product-design-intern",
    title: "Product Design Intern",
    company: "Northstar Labs",
    companyInitials: "NL",
    location: "Baku, Azerbaijan",
    workMode: "Hybrid",
    employmentType: "Internship",
    compensation: "$900–$1,200 / month",
    postedAt: "2 days ago",
    skills: ["Figma", "Research", "Prototyping"],
    description:
      "Join a collaborative product team exploring how thoughtful research and interaction design can make complex tools feel simple.",
    responsibilities: [
      "Support user research, synthesis, and early product discovery.",
      "Create wireframes and interactive prototypes for product concepts.",
      "Collaborate with designers and engineers during design reviews.",
    ],
    requirements: [
      "A portfolio showing product thinking or interaction design work.",
      "Working knowledge of Figma and prototyping fundamentals.",
      "Curiosity, clear communication, and comfort asking questions.",
    ],
    featured: true,
  },
  {
    slug: "frontend-engineer",
    title: "Frontend Engineer",
    company: "Orbit Systems",
    companyInitials: "OS",
    location: "Remote — Europe",
    workMode: "Remote",
    employmentType: "Full-time",
    compensation: "$48k–$62k / year",
    postedAt: "4 days ago",
    skills: ["React", "TypeScript", "Accessibility"],
    description:
      "Build fast, accessible product interfaces for distributed engineering teams using a modern React and TypeScript stack.",
    responsibilities: [
      "Ship resilient interface features from discovery through production.",
      "Improve component quality, accessibility, and frontend performance.",
      "Partner with product, design, and platform engineers across time zones.",
    ],
    requirements: [
      "Professional experience building React applications with TypeScript.",
      "Strong knowledge of semantic HTML and accessible interaction patterns.",
      "Comfort working asynchronously in a remote engineering team.",
    ],
  },
  {
    slug: "growth-analyst",
    title: "Growth Analyst",
    company: "Mosaic Finance",
    companyInitials: "MF",
    location: "Tbilisi, Georgia",
    workMode: "On-site",
    employmentType: "Full-time",
    compensation: "$32k–$40k / year",
    postedAt: "1 week ago",
    skills: ["SQL", "Analytics", "Experiments"],
    description:
      "Turn customer and product data into practical experiments that help more people understand and use everyday financial tools.",
    responsibilities: [
      "Build recurring analyses for acquisition, activation, and retention.",
      "Design measurement plans for product and growth experiments.",
      "Present clear recommendations to product and commercial partners.",
    ],
    requirements: [
      "Strong SQL skills and confidence working with product datasets.",
      "Experience defining metrics and evaluating experiments.",
      "An ability to explain analytical findings to non-technical partners.",
    ],
  },
];

export const featuredOpportunities = mockOpportunities;

export function getOpportunityBySlug(slug: string) {
  return mockOpportunities.find((opportunity) => opportunity.slug === slug);
}

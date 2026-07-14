import { Badge } from "@/components/ui/badge";
import type { ApplicationStatusValue } from "@/features/applications/schemas";

const statusVariants: Record<
  ApplicationStatusValue,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SUBMITTED: "secondary",
  UNDER_REVIEW: "secondary",
  INTERVIEW: "default",
  OFFER: "default",
  HIRED: "default",
  REJECTED: "destructive",
  WITHDRAWN: "outline",
};

/** Locale-aware status badge; the caller supplies the localized label. */
export function ApplicationStatusBadge({
  status,
  label,
}: {
  status: ApplicationStatusValue;
  label: string;
}) {
  if (status === "HIRED") {
    return (
      <Badge className="bg-highlight text-highlight-foreground">{label}</Badge>
    );
  }
  return <Badge variant={statusVariants[status]}>{label}</Badge>;
}

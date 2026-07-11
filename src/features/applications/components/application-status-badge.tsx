import { Badge } from "@/components/ui/badge";
import {
  type ApplicationStatusValue,
  applicationStatusLabels,
} from "@/features/applications/schemas";

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

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatusValue;
}) {
  if (status === "HIRED") {
    return (
      <Badge className="bg-highlight text-highlight-foreground">Hired</Badge>
    );
  }
  return (
    <Badge variant={statusVariants[status]}>
      {applicationStatusLabels[status]}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { type JobStatusValue, jobStatusLabels } from "@/features/jobs/schemas";

const statusVariants: Record<
  JobStatusValue,
  "default" | "secondary" | "outline"
> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CLOSED: "outline",
  ARCHIVED: "outline",
};

export function JobStatusBadge({ status }: { status: JobStatusValue }) {
  return (
    <Badge variant={statusVariants[status]}>{jobStatusLabels[status]}</Badge>
  );
}

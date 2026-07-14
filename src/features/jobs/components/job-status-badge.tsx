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

export function JobStatusBadge({
  status,
  label = jobStatusLabels[status],
}: {
  status: JobStatusValue;
  label?: string;
}) {
  return <Badge variant={statusVariants[status]}>{label}</Badge>;
}

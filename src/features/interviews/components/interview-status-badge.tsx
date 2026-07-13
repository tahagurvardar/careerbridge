import { Badge } from "@/components/ui/badge";
import {
  type InterviewStatusValue,
  interviewStatusLabels,
} from "@/features/interviews/interviews";

const statusVariants: Record<
  InterviewStatusValue,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING_RESPONSE: "secondary",
  ACCEPTED: "default",
  DECLINED: "destructive",
  CANCELED: "outline",
  COMPLETED: "default",
};

export function InterviewStatusBadge({
  status,
}: {
  status: InterviewStatusValue;
}) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-highlight text-highlight-foreground">
        Completed
      </Badge>
    );
  }
  return (
    <Badge variant={statusVariants[status]}>
      {interviewStatusLabels[status]}
    </Badge>
  );
}

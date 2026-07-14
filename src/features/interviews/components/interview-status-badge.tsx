import { Badge } from "@/components/ui/badge";
import type { InterviewStatusValue } from "@/features/interviews/interviews";

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

/** Locale-aware status badge; the caller supplies the localized label. */
export function InterviewStatusBadge({
  status,
  label,
}: {
  status: InterviewStatusValue;
  label: string;
}) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-highlight text-highlight-foreground">{label}</Badge>
    );
  }
  return <Badge variant={statusVariants[status]}>{label}</Badge>;
}

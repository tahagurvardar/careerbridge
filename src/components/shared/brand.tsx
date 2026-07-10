import Link from "next/link";
import { Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  compact?: boolean;
}

export function Brand({ className, compact = false }: BrandProps) {
  return (
    <Link
      href="/"
      aria-label="CareerBridge home"
      className={cn(
        "focus-visible:ring-ring inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-sm">
        <Waypoints aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="text-lg">
          Career<span className="text-primary">Bridge</span>
        </span>
      )}
    </Link>
  );
}

import Link from "next/link";
import { Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandProps {
  /** Pre-localized home path (e.g. `/tr`). */
  href: string;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
}

export function Brand({
  href,
  ariaLabel,
  className,
  compact = false,
}: BrandProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
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

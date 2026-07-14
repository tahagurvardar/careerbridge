import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RouteLocale } from "@/i18n/config";
import { formatInteger } from "@/i18n/formatter";

export function MetricCard({
  label,
  value,
  description,
  icon,
  locale,
}: {
  label: string;
  value: number | string;
  description: string;
  icon?: ReactNode;
  locale: RouteLocale;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {icon ? (
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              {icon}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {typeof value === "number" ? formatInteger(locale, value) : value}
        </p>
        <CardDescription className="mt-2 leading-5">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

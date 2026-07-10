import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type DashboardPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  roleLabel: string;
  items: PreviewItem[];
};

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
  roleLabel,
  items,
}: DashboardPlaceholderProps) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{roleLabel}</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              Phase 1 workspace
            </span>
          </div>
          <p className="text-primary mt-6 text-sm font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            {description}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="h-full">
                <CardHeader>
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="mt-4 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="text-muted-foreground leading-6">
                    {item.description}
                  </p>
                  <span className="text-muted-foreground mt-6 flex items-center gap-2 text-xs font-medium uppercase">
                    Coming in a later phase
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

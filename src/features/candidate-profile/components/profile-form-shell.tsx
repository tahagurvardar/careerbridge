import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileFormShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href="/candidate/profile">
            <ArrowLeft aria-hidden="true" />
            Back to profile
          </Link>
        </Button>
        <div className="mb-8">
          <p className="text-primary text-sm font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            {description}
          </p>
        </div>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </section>
  );
}

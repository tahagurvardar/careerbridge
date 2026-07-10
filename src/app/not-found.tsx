import Link from "next/link";
import { ArrowLeft, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <Waypoints aria-hidden="true" className="size-7" />
      </span>
      <p className="text-primary mt-6 font-mono text-sm font-semibold">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        This path does not connect yet.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-lg leading-7">
        The page may have moved, or it may be part of a future CareerBridge
        phase.
      </p>
      <Button className="mt-7" asChild>
        <Link href="/">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Back to CareerBridge
        </Link>
      </Button>
    </section>
  );
}

import Link from "next/link";
import { ArrowLeft, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, getRequestLocale } from "@/i18n/server";

// `not-found.tsx` receives no route params, so the locale comes from the
// request context (the proxy stamps the validated URL locale into a header).
export default async function NotFound() {
  const locale = await getRequestLocale();
  const { common } = await getDictionary(locale);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <Waypoints aria-hidden="true" className="size-7" />
      </span>
      <p className="text-primary mt-6 font-mono text-sm font-semibold">
        {common.notFound.code}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        {common.notFound.title}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-lg leading-7">
        {common.notFound.description}
      </p>
      <Button className="mt-7" asChild>
        <Link href={localizeInternalPath("/", locale)}>
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          {common.notFound.backHome}
        </Link>
      </Button>
    </section>
  );
}

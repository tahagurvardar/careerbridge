import { Badge } from "@/components/ui/badge";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <section className="border-border/70 border-b">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Badge variant="secondary" className="mb-5">
          {eyebrow}
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}

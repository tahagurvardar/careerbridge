import { Badge } from "@/components/ui/badge";

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <Badge variant="secondary">Platform administration</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 leading-7">{description}</p>
    </div>
  );
}

import { Badge } from "@/components/ui/Badge";

interface ExampleLabelProps {
  kind?: "Example" | "Illustration";
}

export function ExampleLabel({ kind = "Example" }: ExampleLabelProps) {
  return (
    <p className="mb-2 flex items-center gap-2">
      <Badge tone="info">{kind}</Badge>
      <span className="text-xs text-ink-muted">
        Fictional teaching data. Not analysis of your files.
      </span>
    </p>
  );
}

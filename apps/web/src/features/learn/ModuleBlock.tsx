import type { ReactNode } from "react";

interface ModuleBlockProps {
  title: string;
  children: ReactNode;
}

export function ModuleBlock({ title, children }: ModuleBlockProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <div className="max-w-2xl space-y-3 text-sm leading-6 text-ink-secondary">
        {children}
      </div>
    </section>
  );
}

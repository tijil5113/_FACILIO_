import type { ReactNode } from "react";

interface LearnModuleProps {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}

export function LearnModule({ id, eyebrow, title, children }: LearnModuleProps) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5" aria-labelledby={`${id}-heading`}>
      {eyebrow ? (
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

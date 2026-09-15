import { cn } from "@/lib/cn";

interface KbdProps {
  children: string;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--facilio-radius-sm)] border border-line bg-subtle px-1 font-mono text-[10px] text-ink-muted",
      )}
    >
      {children}
    </kbd>
  );
}

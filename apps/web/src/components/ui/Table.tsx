import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  caption?: string;
  wrapClassName?: string;
}

export function Table({
  caption,
  className,
  wrapClassName,
  children,
  ...props
}: TableProps) {
  return (
    <div className={cn("facilio-table-wrap", wrapClassName)}>
      <div className="facilio-table-scroll">
        <table className={cn("facilio-table", className)} {...props}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}

export function TableRow({ interactive = false, className, ...props }: TableRowProps) {
  return (
    <tr data-interactive={interactive || undefined} className={className} {...props} />
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={className} {...props} />;
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={className} {...props} />;
}

export function TableEmpty({ children }: { children: ReactNode }) {
  return (
    <tr>
      <td colSpan={99} className="px-3 py-8 text-center text-sm text-ink-muted">
        {children}
      </td>
    </tr>
  );
}

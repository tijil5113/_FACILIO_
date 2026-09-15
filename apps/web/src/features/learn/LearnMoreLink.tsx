import { Link } from "react-router";

interface LearnMoreLinkProps {
  to: string;
  children: string;
}

export function LearnMoreLink({ to, children }: LearnMoreLinkProps) {
  return (
    <Link
      to={to}
      className="text-sm text-ink-secondary underline decoration-line underline-offset-4 hover:text-ink"
    >
      {children}
    </Link>
  );
}

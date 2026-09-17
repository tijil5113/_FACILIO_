import { ButtonLink } from "@/components/ui/ButtonLink";

import { adjacentTopics, learnPath } from "./learn-topics";

interface LearnPagerProps {
  topicId: string;
}

export function LearnPager({ topicId }: LearnPagerProps) {
  const { previous, next } = adjacentTopics(topicId);

  return (
    <nav
      aria-label="Learn module"
      className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <ButtonLink to={learnPath("home")} variant="ghost" size="sm">
        Learn overview
      </ButtonLink>
      {previous ? (
        <ButtonLink to={learnPath(previous.id)} variant="secondary" size="sm">
          Previous: {previous.label}
        </ButtonLink>
      ) : null}
      {next ? (
        <ButtonLink to={learnPath(next.id)} size="sm">
          Next: {next.label}
        </ButtonLink>
      ) : null}
    </nav>
  );
}

import { Link, useNavigate } from "react-router";

import { LEARN_TOPICS, learnPath } from "./learn-topics";

interface LearnNavigationProps {
  activeTopicId: string;
}

export function LearnNavigation({ activeTopicId }: LearnNavigationProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Learn topics" className="space-y-3">
      <label className="block text-xs font-medium text-ink-secondary lg:hidden">
        Topic
        <select
          className="mt-1 h-9 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm text-ink"
          value={activeTopicId}
          onChange={(event) => {
            void navigate(learnPath(event.target.value));
          }}
        >
          {LEARN_TOPICS.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>
      <ul className="hidden gap-1 overflow-x-auto lg:flex lg:flex-col">
        {LEARN_TOPICS.map((topic) => {
          const current = topic.id === activeTopicId;
          return (
            <li key={topic.id}>
              <Link
                to={learnPath(topic.id)}
                aria-current={current ? "true" : undefined}
                className={`block rounded-[var(--facilio-radius-md)] px-3 py-2 text-sm transition-colors duration-[var(--facilio-duration-fast)] ${
                  current
                    ? "bg-subtle text-ink"
                    : "text-ink-secondary hover:bg-subtle hover:text-ink"
                }`}
              >
                {topic.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

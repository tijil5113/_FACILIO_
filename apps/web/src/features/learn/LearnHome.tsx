import { Link } from "react-router";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

import { LEARN_TOPICS, learnPath } from "./learn-topics";
import { ProductAction } from "./ProductAction";
import { ProcessDiagram } from "./ProcessDiagram";

const TOPIC_CARDS = LEARN_TOPICS.filter((topic) => topic.id !== "home");

export function LearnHome() {
  return (
    <section id="home" className="scroll-mt-20 space-y-8" aria-labelledby="learn-heading">
      <PageHeader
        title="Learn FACILIO"
        titleId="learn-heading"
        description="Understand your data. Understand what FACILIO does. Know exactly what happens before you make a change."
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-ink">FACILIO helps you</h2>
        <ProcessDiagram
          label="How FACILIO works"
          steps={[
            "Bring data",
            "Analyze",
            "Find problems",
            "Clean",
            "Keep versions",
            "Reuse",
            "Follow activity",
          ]}
        />
      </div>

      <Card as="section" aria-labelledby="start-here-heading">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Start here
        </p>
        <h2 id="start-here-heading" className="mt-2 text-base font-medium text-ink">
          FACILIO in 2 minutes
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          The complete mental model: bring data, understand it, find problems, preview
          fixes, create a cleaned version, reuse useful steps, and review activity.
        </p>
        <div className="mt-4">
          <ProductAction to={learnPath("start")} variant="primary">
            Start with FACILIO in 2 minutes
          </ProductAction>
        </div>
      </Card>

      <section aria-labelledby="core-topics-heading">
        <h2 id="core-topics-heading" className="mb-3 text-sm font-medium text-ink">
          Core topics
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOPIC_CARDS.filter((topic) => topic.id !== "start").map((topic) => (
            <li key={topic.id}>
              <Card as="article" className="h-full">
                <h3 className="text-sm font-medium text-ink">{topic.label}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  {topic.description}
                </p>
                <p className="mt-3">
                  <Link
                    to={learnPath(topic.id)}
                    className="text-sm text-ink underline decoration-line underline-offset-4"
                  >
                    Open {topic.label}
                  </Link>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card as="section" aria-labelledby="try-yourself-heading">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Try it yourself
        </p>
        <h2 id="try-yourself-heading" className="mt-2 text-base font-medium text-ink">
          Use the FACILIO sample
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          The same Try FACILIO journey as Home. It uses the real engine and a fictional
          customer file — not a separate demo.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ProductAction to="/overview?try=1" variant="primary">
            Try FACILIO
          </ProductAction>
          <ProductAction to="/datasets?upload=1">Upload data</ProductAction>
        </div>
      </Card>
    </section>
  );
}

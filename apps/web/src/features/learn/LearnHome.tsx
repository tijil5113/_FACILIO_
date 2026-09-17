import { Link } from "react-router";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONCEPTS } from "@/features/education/concepts";

import { LEARN_JOURNEY, learnPath } from "./learn-topics";
import { ProcessDiagram } from "./ProcessDiagram";
import { ProductAction } from "./ProductAction";

export function LearnHome() {
  return (
    <section id="home" className="scroll-mt-20 space-y-8" aria-labelledby="learn-heading">
      <PageHeader
        title="Learn FACILIO"
        titleId="learn-heading"
        description="Understand the ideas behind FACILIO and learn how to use the product safely."
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-ink">The product in one pass</h2>
        <ProcessDiagram
          label="How FACILIO works"
          steps={[
            "Bring data",
            "Analyze",
            "Review problems",
            "Preview cleaning",
            "Create cleaned version",
            "Reuse cleaning steps",
          ]}
        />
      </div>

      <Card as="section" aria-labelledby="start-here-heading">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Start here
        </p>
        <h2 id="start-here-heading" className="mt-2 text-base font-medium text-ink">
          FACILIO in a minute
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          {CONCEPTS.product.what}
        </p>
        <div className="mt-4">
          <ProductAction to={learnPath("start")} variant="primary">
            Start with FACILIO in a minute
          </ProductAction>
        </div>
      </Card>

      <section aria-labelledby="core-topics-heading">
        <h2 id="core-topics-heading" className="mb-3 text-sm font-medium text-ink">
          Learning journey
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {LEARN_JOURNEY.map((topic, index) => (
            <li key={topic.id}>
              <Card as="article" className="h-full">
                <p className="font-mono text-[11px] text-ink-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-sm font-medium text-ink">{topic.label}</h3>
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
        </ol>
      </section>

      <Card as="section" aria-labelledby="try-yourself-heading">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Try it in FACILIO
        </p>
        <h2 id="try-yourself-heading" className="mt-2 text-base font-medium text-ink">
          Use the real product
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          These open live routes. The sample uses the real engine and a fictional customer
          file.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ProductAction to="/overview?try=1" variant="primary">
            Try FACILIO
          </ProductAction>
          <ProductAction to="/datasets">Open Datasets</ProductAction>
          <ProductAction to="/workflows">Open Cleanups</ProductAction>
          <ProductAction to="/jobs">View Activity</ProductAction>
        </div>
      </Card>
    </section>
  );
}

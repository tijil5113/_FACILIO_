import { expect, test } from "vitest";

import type { QualityIssue } from "@/types/profile";

import {
  affectedCountLabel,
  groupIssues,
  humanIssueTitle,
  isActionableIssue,
} from "./issue-language";

function issue(overrides: Partial<QualityIssue>): QualityIssue {
  return {
    id: "MISSING_VALUES:email",
    code: "MISSING_VALUES",
    category: "COMPLETENESS",
    severity: "INFO",
    title: "Missing values",
    description: "3 null values in email.",
    column: "email",
    affected_count: 3,
    affected_percentage: 15,
    evidence: [],
    suggested_action: "Review missing email values.",
    suggested_operations: [
      {
        code: "FILL_MISSING",
        display_name: "Fill missing values",
        reason: "Replace true nulls.",
        parameters: { column: "email" },
      },
    ],
    ...overrides,
  };
}

test("human titles include the affected column without leading with the code", () => {
  expect(humanIssueTitle(issue({}))).toBe("Missing values in email");
  expect(humanIssueTitle(issue({ title: "Duplicate rows", column: null }))).toBe(
    "Duplicate rows",
  );
});

test("high cardinality is informational even if a suggestion appears", () => {
  expect(
    isActionableIssue(
      issue({
        code: "HIGH_CARDINALITY",
        category: "STRUCTURE",
        suggested_operations: [],
      }),
    ),
  ).toBe(false);
});

test("issues group by engine category labels", () => {
  const groups = groupIssues([
    issue({ id: "1", category: "VALIDITY" }),
    issue({ id: "2", category: "COMPLETENESS" }),
    issue({
      id: "3",
      code: "DUPLICATE_ROWS",
      category: "UNIQUENESS",
      title: "Duplicate rows",
      column: null,
    }),
  ]);
  expect(groups.map((group) => group.label)).toEqual([
    "Missing information",
    "Duplicates",
    "Validity",
  ]);
});

test("affected counts do not invent a denominator", () => {
  expect(affectedCountLabel(3, 20)).toBe("3 of 20 rows");
  expect(affectedCountLabel(3, null)).toBe("3 rows");
});

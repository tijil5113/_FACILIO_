import { describe, expect, test } from "vitest";

import {
  groupedCatalog,
  humanStepLabel,
  transformationPickerDescription,
} from "./step-language";
import type { TransformationDefinition } from "@/types/transformations";

const trim: TransformationDefinition = {
  code: "TRIM_WHITESPACE",
  display_name: "Trim whitespace",
  description: "Remove leading and trailing whitespace from string values.",
  category: "CLEAN_TEXT",
  supported_column_types: ["TEXT"],
  dataset_level: false,
  notes: [],
  parameters: [],
};

describe("humanStepLabel", () => {
  test("describes ordered cleaning actions in human language", () => {
    expect(humanStepLabel("TRIM_WHITESPACE", { column: "customer_name" })).toBe(
      "Remove extra spaces from customer_name",
    );
    expect(
      humanStepLabel("NORMALIZE_CASE", { column: "status", mode: "lowercase" }),
    ).toBe("Standardize status to lowercase");
    expect(humanStepLabel("FILL_MISSING", { column: "age", strategy: "median" })).toBe(
      "Fill missing age values with the median",
    );
    expect(humanStepLabel("REMOVE_DUPLICATES", {})).toBe("Remove exact duplicate rows");
  });
});

describe("transformationPickerDescription", () => {
  test("uses deterministic beginner language", () => {
    expect(transformationPickerDescription(trim)).toBe(
      "Remove spaces before and after text.",
    );
  });
});

describe("groupedCatalog", () => {
  test("uses actual catalog families", () => {
    const groups = groupedCatalog([
      trim,
      {
        ...trim,
        code: "REMOVE_DUPLICATES",
        category: "ROWS",
      },
    ]);
    expect(groups.map((item) => item.label)).toEqual(["Text", "Rows"]);
  });
});

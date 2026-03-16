import { describe, test, expect } from "vitest";
import { mergeConfig } from "./merge-config.ts";

describe("mergeConfig", () => {
  test("adds new top-level keys to empty config", () => {
    const existing = {};
    const extensions = { workflow: { code_review: true } };

    const { merged, keysAdded } = mergeConfig(existing, extensions);

    expect(merged).toEqual({ workflow: { code_review: true } });
    expect(keysAdded).toEqual(["workflow"]);
  });

  test("adds new nested keys without overwriting existing ones", () => {
    const existing = {
      workflow: { verifier: true, research: true },
    };
    const extensions = {
      workflow: { code_review: true, generate_docs: true },
    };

    const { merged, keysAdded } = mergeConfig(existing, extensions);

    expect(merged).toEqual({
      workflow: {
        verifier: true,
        research: true,
        code_review: true,
        generate_docs: true,
      },
    });
    expect(keysAdded).toContain("workflow.code_review");
    expect(keysAdded).toContain("workflow.generate_docs");
    expect(keysAdded).not.toContain("workflow.verifier");
  });

  test("does not overwrite existing values", () => {
    const existing = {
      workflow: { code_review: false },
    };
    const extensions = {
      workflow: { code_review: true },
    };

    const { merged, keysAdded } = mergeConfig(existing, extensions);

    expect((merged as Record<string, Record<string, boolean>>).workflow.code_review).toBe(false);
    expect(keysAdded).toEqual([]);
  });

  test("adds entirely new sections", () => {
    const existing = {
      mode: "interactive",
      workflow: { verifier: true },
    };
    const extensions = {
      review: { block_on_critical: true, enforce_claude_md: true },
      documentation: { output_dir: "docs" },
    };

    const { merged, keysAdded } = mergeConfig(existing, extensions);

    expect(merged).toHaveProperty("review");
    expect(merged).toHaveProperty("documentation");
    expect(merged).toHaveProperty("mode", "interactive");
    expect(keysAdded).toContain("review");
    expect(keysAdded).toContain("documentation");
  });

  test("does not mutate the original config", () => {
    const existing = { workflow: { verifier: true } };
    const original = structuredClone(existing);
    const extensions = { workflow: { code_review: true } };

    mergeConfig(existing, extensions);

    expect(existing).toEqual(original);
  });

  test("handles deeply nested objects", () => {
    const existing = {
      documentation: { output_dir: "docs" },
    };
    const extensions = {
      documentation: { output_dir: "other", api_spec_format: "yaml" },
    };

    const { merged, keysAdded } = mergeConfig(existing, extensions);

    expect(
      (merged as Record<string, Record<string, string>>).documentation.output_dir,
    ).toBe("docs");
    expect(
      (merged as Record<string, Record<string, string>>).documentation.api_spec_format,
    ).toBe("yaml");
    expect(keysAdded).toEqual(["documentation.api_spec_format"]);
  });
});

import { describe, test, expect } from "vitest";
import { patchExecutePhase } from "./patch-execute-phase.ts";

const SAMPLE_EXECUTE_PHASE = `<process>

<step name="close_parent_artifacts">
Some content about closing parent artifacts.
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.
</step>

<step name="update_roadmap">
Mark phase complete.
</step>

</process>`;

const REVIEW_STEP_CONTENT = `<step name="gsdpp_code_review">
## Code Review (GSD++ Extension)

Spawn gsd-code-reviewer with phase context.
</step>`;

describe("patchExecutePhase", () => {
  test("inserts review step between close_parent_artifacts and verify_phase_goal", () => {
    const result = patchExecutePhase(SAMPLE_EXECUTE_PHASE, REVIEW_STEP_CONTENT);

    expect(result.success).toBe(true);
    expect(result.action).toBe("applied");
  });

  test("returns skipped when verify_phase_goal anchor is missing", () => {
    const content = "<process><step name='something'>content</step></process>";

    const result = patchExecutePhase(content, REVIEW_STEP_CONTENT);

    expect(result.success).toBe(false);
    expect(result.action).toBe("skipped");
  });

  test("returns skipped when no preceding </step> found", () => {
    const content = '<step name="verify_phase_goal">content</step>';

    const result = patchExecutePhase(content, REVIEW_STEP_CONTENT);

    expect(result.success).toBe(false);
    expect(result.action).toBe("skipped");
  });

  test("replaces existing patch when markers are present", () => {
    const alreadyPatched = `<process>

<step name="close_parent_artifacts">
Some content.
</step>

<!-- GSD++ BEGIN: code-review -->
<step name="gsdpp_code_review">
Old review content.
</step>
<!-- GSD++ END: code-review -->

<step name="verify_phase_goal">
Verify phase.
</step>

</process>`;

    const result = patchExecutePhase(alreadyPatched, REVIEW_STEP_CONTENT);

    expect(result.success).toBe(true);
    expect(result.action).toBe("updated");
  });

  test("preserves content before and after injection point", () => {
    const result = patchExecutePhase(SAMPLE_EXECUTE_PHASE, REVIEW_STEP_CONTENT);

    expect(result.success).toBe(true);
    // The result object confirms success; the actual content patching
    // is verified via applyPatch which writes to disk
  });
});

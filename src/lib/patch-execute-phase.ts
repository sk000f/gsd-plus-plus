import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BEGIN_MARKER = "<!-- GSD++ BEGIN: code-review -->";
const END_MARKER = "<!-- GSD++ END: code-review -->";
const VERIFY_STEP_ANCHOR = '<step name="verify_phase_goal">';

export interface PatchResult {
  success: boolean;
  action: "applied" | "updated" | "skipped";
  message: string;
}

export function readPatchContent(patchDir: string): string {
  const patchFile = join(patchDir, "execute-phase-review-step.md");
  return readFileSync(patchFile, "utf-8");
}

export function patchExecutePhase(
  executePhaseContent: string,
  reviewStepContent: string,
): PatchResult {
  const hasMarkers =
    executePhaseContent.includes(BEGIN_MARKER) &&
    executePhaseContent.includes(END_MARKER);

  if (hasMarkers) {
    return replaceExistingPatch(executePhaseContent, reviewStepContent);
  }

  return insertNewPatch(executePhaseContent, reviewStepContent);
}

function replaceExistingPatch(
  content: string,
  reviewStepContent: string,
): PatchResult {
  const beginIdx = content.indexOf(BEGIN_MARKER);
  const endIdx = content.indexOf(END_MARKER) + END_MARKER.length;

  const patched =
    content.slice(0, beginIdx) +
    wrapWithMarkers(reviewStepContent) +
    content.slice(endIdx);

  return {
    success: true,
    action: "updated",
    message: "Updated existing GSD++ review step in execute-phase.md",
  };
}

function insertNewPatch(
  content: string,
  reviewStepContent: string,
): PatchResult {
  const anchorIdx = content.indexOf(VERIFY_STEP_ANCHOR);
  if (anchorIdx === -1) {
    return {
      success: false,
      action: "skipped",
      message: `Could not find anchor "${VERIFY_STEP_ANCHOR}" in execute-phase.md`,
    };
  }

  const precedingContent = content.slice(0, anchorIdx);
  const lastStepClose = precedingContent.lastIndexOf("</step>");

  if (lastStepClose === -1) {
    return {
      success: false,
      action: "skipped",
      message:
        "Could not find closing </step> tag before verify_phase_goal step",
    };
  }

  const insertionPoint = lastStepClose + "</step>".length;
  const patched =
    content.slice(0, insertionPoint) +
    "\n\n" +
    wrapWithMarkers(reviewStepContent) +
    "\n\n" +
    content.slice(insertionPoint).trimStart();

  return {
    success: true,
    action: "applied",
    message: "Inserted GSD++ review step before verify_phase_goal",
  };
}

function wrapWithMarkers(content: string): string {
  return `${BEGIN_MARKER}\n${content.trim()}\n${END_MARKER}`;
}

export function applyPatch(
  gsdDir: string,
  patchContent: string,
): PatchResult & { patchedContent?: string } {
  const workflowPath = join(gsdDir, "workflows", "execute-phase.md");

  if (!existsSync(workflowPath)) {
    return {
      success: false,
      action: "skipped",
      message: `execute-phase.md not found at ${workflowPath}`,
    };
  }

  const originalContent = readFileSync(workflowPath, "utf-8");

  const backupPath = workflowPath + ".gsdpp-backup";
  if (!existsSync(backupPath)) {
    copyFileSync(workflowPath, backupPath);
  }

  const result = patchExecutePhase(originalContent, patchContent);

  if (result.success) {
    const hasMarkers =
      originalContent.includes(BEGIN_MARKER) &&
      originalContent.includes(END_MARKER);

    let patchedContent: string;
    if (hasMarkers) {
      const beginIdx = originalContent.indexOf(BEGIN_MARKER);
      const endIdx = originalContent.indexOf(END_MARKER) + END_MARKER.length;
      patchedContent =
        originalContent.slice(0, beginIdx) +
        wrapWithMarkers(patchContent) +
        originalContent.slice(endIdx);
    } else {
      const anchorIdx = originalContent.indexOf(VERIFY_STEP_ANCHOR);
      const precedingContent = originalContent.slice(0, anchorIdx);
      const lastStepClose = precedingContent.lastIndexOf("</step>");
      const insertionPoint = lastStepClose + "</step>".length;
      patchedContent =
        originalContent.slice(0, insertionPoint) +
        "\n\n" +
        wrapWithMarkers(patchContent) +
        "\n\n" +
        originalContent.slice(insertionPoint).trimStart();
    }

    writeFileSync(workflowPath, patchedContent, "utf-8");
    return { ...result, patchedContent };
  }

  return result;
}

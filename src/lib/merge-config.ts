import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface MergeResult {
  success: boolean;
  action: "merged" | "created" | "skipped";
  message: string;
  keysAdded: string[];
}

function deepMergeNewKeys(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  path: string = "",
): string[] {
  const keysAdded: string[] = [];

  for (const key of Object.keys(source)) {
    const fullPath = path ? `${path}.${key}` : key;
    const sourceVal = source[key];
    const targetVal = target[key];

    if (!(key in target)) {
      target[key] = sourceVal;
      keysAdded.push(fullPath);
    } else if (
      isPlainObject(sourceVal) &&
      isPlainObject(targetVal)
    ) {
      const nested = deepMergeNewKeys(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
        fullPath,
      );
      keysAdded.push(...nested);
    }
    // Existing keys are never overwritten
  }

  return keysAdded;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function mergeConfig(
  existingConfig: Record<string, unknown>,
  extensions: Record<string, unknown>,
): { merged: Record<string, unknown>; keysAdded: string[] } {
  const merged = structuredClone(existingConfig);
  const keysAdded = deepMergeNewKeys(merged, extensions);
  return { merged, keysAdded };
}

export function applyConfigExtensions(
  projectDir: string,
  extensions: Record<string, unknown>,
): MergeResult {
  const configPath = join(projectDir, ".planning", "config.json");

  if (!existsSync(configPath)) {
    return {
      success: true,
      action: "skipped",
      message:
        "No .planning/config.json found — config extensions will be applied when GSD initializes a project",
      keysAdded: [],
    };
  }

  const existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<
    string,
    unknown
  >;
  const { merged, keysAdded } = mergeConfig(existing, extensions);

  if (keysAdded.length === 0) {
    return {
      success: true,
      action: "skipped",
      message: "All config extension keys already present",
      keysAdded: [],
    };
  }

  writeFileSync(configPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");

  return {
    success: true,
    action: "merged",
    message: `Added ${keysAdded.length} new config keys`,
    keysAdded,
  };
}

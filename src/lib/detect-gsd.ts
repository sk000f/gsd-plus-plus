import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GsdDetectionResult } from "./schemas.ts";

const MIN_VERSION = [1, 22, 0] as const;

function parseVersion(version: string): [number, number, number] | null {
  const parts = version.trim().split(".");
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return nums as unknown as [number, number, number];
}

function meetsMinimumVersion(version: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;

  for (let i = 0; i < 3; i++) {
    if (parsed[i] > MIN_VERSION[i]) return true;
    if (parsed[i] < MIN_VERSION[i]) return false;
  }
  return true;
}

export function detectGsd(projectDir: string): GsdDetectionResult {
  const claudeDir = join(projectDir, ".claude");
  const gsdDir = join(claudeDir, "get-shit-done");
  const versionFile = join(gsdDir, "VERSION");

  const notFound: GsdDetectionResult = {
    found: false,
    version: "",
    claudeDir,
    gsdDir,
  };

  if (!existsSync(versionFile)) {
    return notFound;
  }

  const version = readFileSync(versionFile, "utf-8").trim();

  if (!meetsMinimumVersion(version)) {
    return notFound;
  }

  return {
    found: true,
    version,
    claudeDir,
    gsdDir,
  };
}

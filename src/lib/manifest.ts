import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { GsdPPManifestSchema, type GsdPPManifest } from "./schemas.ts";

const MANIFEST_FILENAME = "gsd-pp-manifest.json";

export function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function createManifest(
  gsdppVersion: string,
  gsdVersion: string,
  files: Record<string, string>,
): GsdPPManifest {
  return {
    gsdpp_version: gsdppVersion,
    gsd_version: gsdVersion,
    installed_at: new Date().toISOString(),
    files,
  };
}

export function readManifest(projectDir: string): GsdPPManifest | null {
  const manifestPath = join(projectDir, MANIFEST_FILENAME);

  if (!existsSync(manifestPath)) {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    return null;
  }

  const parsed = GsdPPManifestSchema.safeParse(raw);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function writeManifest(
  projectDir: string,
  manifest: GsdPPManifest,
): void {
  const manifestPath = join(projectDir, MANIFEST_FILENAME);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export interface ConflictInfo {
  path: string;
  reason: "modified_locally" | "missing";
}

export function detectConflicts(
  projectDir: string,
  existingManifest: GsdPPManifest,
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  for (const [filePath, expectedHash] of Object.entries(
    existingManifest.files,
  )) {
    const fullPath = join(projectDir, filePath);

    if (!existsSync(fullPath)) {
      conflicts.push({ path: filePath, reason: "missing" });
      continue;
    }

    const currentHash = computeFileHash(fullPath);
    if (currentHash !== expectedHash) {
      conflicts.push({ path: filePath, reason: "modified_locally" });
    }
  }

  return conflicts;
}

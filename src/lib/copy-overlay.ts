import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import { computeFileHash } from "./manifest.ts";

export interface CopyResult {
  success: boolean;
  filesCopied: string[];
  fileHashes: Record<string, string>;
  message: string;
}

interface OverlayMapping {
  source: string;
  destination: string;
}

function getOverlayMappings(
  packageDir: string,
  claudeDir: string,
): OverlayMapping[] {
  return [
    {
      source: join(packageDir, "agents"),
      destination: join(claudeDir, "agents"),
    },
    {
      source: join(packageDir, "commands", "gsd"),
      destination: join(claudeDir, "commands", "gsd"),
    },
    {
      source: join(packageDir, "get-shit-done", "workflows"),
      destination: join(claudeDir, "get-shit-done", "workflows"),
    },
    {
      source: join(packageDir, "get-shit-done", "references"),
      destination: join(claudeDir, "get-shit-done", "references"),
    },
  ];
}

function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export function copyOverlayFiles(
  packageDir: string,
  claudeDir: string,
  projectDir: string,
): CopyResult {
  const mappings = getOverlayMappings(packageDir, claudeDir);
  const filesCopied: string[] = [];
  const fileHashes: Record<string, string> = {};

  for (const mapping of mappings) {
    if (!existsSync(mapping.source)) continue;

    mkdirSync(mapping.destination, { recursive: true });

    const sourceFiles = collectFiles(mapping.source);

    for (const sourceFile of sourceFiles) {
      const relativePath = relative(mapping.source, sourceFile);
      const destFile = join(mapping.destination, relativePath);

      const destDir = join(destFile, "..");
      mkdirSync(destDir, { recursive: true });

      cpSync(sourceFile, destFile);

      const relativeToProject = relative(projectDir, destFile);
      filesCopied.push(relativeToProject);
      fileHashes[relativeToProject] = computeFileHash(destFile);
    }
  }

  return {
    success: true,
    filesCopied,
    fileHashes,
    message: `Copied ${filesCopied.length} overlay files`,
  };
}

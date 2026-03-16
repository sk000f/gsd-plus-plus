#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectGsd } from "../lib/detect-gsd.ts";
import { copyOverlayFiles } from "../lib/copy-overlay.ts";
import { applyPatch, readPatchContent } from "../lib/patch-execute-phase.ts";
import { applyConfigExtensions } from "../lib/merge-config.ts";
import {
  readManifest,
  writeManifest,
  createManifest,
  detectConflicts,
} from "../lib/manifest.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..", "..");

function getVersion(): string {
  return readFileSync(join(PACKAGE_ROOT, "VERSION"), "utf-8").trim();
}

function loadConfigExtensions(): Record<string, unknown> {
  const configPath = join(PACKAGE_ROOT, "config-extensions.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function log(message: string): void {
  console.log(`  ${message}`);
}

function heading(message: string): void {
  console.log(`\n${message}`);
}

function install(projectDir: string): void {
  const version = getVersion();
  heading(`GSD++ v${version} — Installing overlay`);

  // 1. Detect GSD
  const gsd = detectGsd(projectDir);
  if (!gsd.found) {
    console.error(
      "\n  Error: GSD not found in this project.",
    );
    console.error(
      "  Install GSD first: npx get-shit-done-cc@latest",
    );
    console.error(
      `  Looked in: ${gsd.gsdDir}`,
    );
    process.exit(1);
  }
  log(`Found GSD v${gsd.version} at ${gsd.gsdDir}`);

  // 2. Check for existing manifest / conflicts
  const existingManifest = readManifest(projectDir);
  if (existingManifest) {
    const conflicts = detectConflicts(projectDir, existingManifest);
    const modified = conflicts.filter((c) => c.reason === "modified_locally");
    if (modified.length > 0) {
      heading("Warning: Locally modified overlay files detected:");
      for (const c of modified) {
        log(`  ${c.path}`);
      }
      log("These files will be overwritten.");
    }
  }

  // 3. Copy overlay files
  heading("Copying overlay files...");
  const copyResult = copyOverlayFiles(PACKAGE_ROOT, gsd.claudeDir, projectDir);
  log(copyResult.message);
  for (const file of copyResult.filesCopied) {
    log(`  + ${file}`);
  }

  // 4. Apply execute-phase patch
  heading("Patching execute-phase.md...");
  const patchesDir = join(PACKAGE_ROOT, "get-shit-done", "patches");
  if (existsSync(patchesDir)) {
    const patchContent = readPatchContent(patchesDir);
    const patchResult = applyPatch(gsd.gsdDir, patchContent);
    log(`${patchResult.action}: ${patchResult.message}`);
  } else {
    log("No patches directory found — skipping");
  }

  // 5. Merge config extensions
  heading("Merging config extensions...");
  const extensions = loadConfigExtensions();
  const configResult = applyConfigExtensions(projectDir, extensions);
  log(`${configResult.action}: ${configResult.message}`);
  if (configResult.keysAdded.length > 0) {
    for (const key of configResult.keysAdded) {
      log(`  + ${key}`);
    }
  }

  // 6. Write manifest
  heading("Writing manifest...");
  const manifest = createManifest(version, gsd.version, copyResult.fileHashes);
  writeManifest(projectDir, manifest);
  log("gsd-pp-manifest.json updated");

  heading(`GSD++ v${version} installed successfully!\n`);
}

function status(projectDir: string): void {
  const gsd = detectGsd(projectDir);
  const manifest = readManifest(projectDir);
  const version = getVersion();

  heading(`GSD++ Status`);
  log(`GSD++ package version: ${version}`);
  log(`GSD found: ${gsd.found ? `v${gsd.version}` : "No"}`);
  log(`GSD++ installed: ${manifest ? `v${manifest.gsdpp_version}` : "No"}`);

  if (manifest) {
    log(`Installed at: ${manifest.installed_at}`);
    log(`GSD version at install: ${manifest.gsd_version}`);
    log(`Overlay files: ${Object.keys(manifest.files).length}`);

    if (gsd.found && gsd.version !== manifest.gsd_version) {
      log(`\n  Warning: GSD version changed since install (${manifest.gsd_version} → ${gsd.version})`);
      log("  Run 'npx gsd-plus-plus install' to re-apply overlay");
    }

    const conflicts = detectConflicts(projectDir, manifest);
    if (conflicts.length > 0) {
      heading("Conflicts:");
      for (const c of conflicts) {
        log(`  ${c.reason}: ${c.path}`);
      }
    }
  }
  console.log();
}

function uninstall(projectDir: string): void {
  const manifest = readManifest(projectDir);

  if (!manifest) {
    console.error("\n  GSD++ is not installed in this project.\n");
    process.exit(1);
  }

  heading("GSD++ — Uninstall");
  log("To uninstall, remove the following files:");
  for (const file of Object.keys(manifest.files)) {
    log(`  - ${file}`);
  }
  log("  - gsd-pp-manifest.json");
  log("\nAnd restore execute-phase.md from .gsdpp-backup if it exists.\n");
}

// CLI
const args = process.argv.slice(2);
const command = args[0] ?? "install";
const projectDir = resolve(process.cwd());

switch (command) {
  case "install":
    install(projectDir);
    break;
  case "status":
    status(projectDir);
    break;
  case "uninstall":
    uninstall(projectDir);
    break;
  default:
    console.log("Usage: gsd-plus-plus <install|status|uninstall>");
    process.exit(1);
}

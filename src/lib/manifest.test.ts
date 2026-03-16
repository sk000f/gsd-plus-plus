import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  computeFileHash,
  createManifest,
  readManifest,
  writeManifest,
  detectConflicts,
} from "./manifest.ts";

describe("manifest", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gsdpp-manifest-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("computeFileHash", () => {
    test("returns consistent SHA-256 hash for same content", () => {
      const file = join(tempDir, "test.txt");
      writeFileSync(file, "hello world");

      const hash1 = computeFileHash(file);
      const hash2 = computeFileHash(file);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    test("returns different hash for different content", () => {
      const file1 = join(tempDir, "a.txt");
      const file2 = join(tempDir, "b.txt");
      writeFileSync(file1, "hello");
      writeFileSync(file2, "world");

      expect(computeFileHash(file1)).not.toBe(computeFileHash(file2));
    });
  });

  describe("createManifest", () => {
    test("creates manifest with correct structure", () => {
      const manifest = createManifest("0.1.0", "1.22.4", {
        ".claude/agents/gsd-code-reviewer.md": "abc123",
      });

      expect(manifest.gsdpp_version).toBe("0.1.0");
      expect(manifest.gsd_version).toBe("1.22.4");
      expect(manifest.files).toHaveProperty(
        ".claude/agents/gsd-code-reviewer.md",
      );
      expect(manifest.installed_at).toBeTruthy();
    });
  });

  describe("readManifest / writeManifest", () => {
    test("roundtrips manifest through write and read", () => {
      const manifest = createManifest("0.1.0", "1.22.4", {
        "test.md": "abc123",
      });

      writeManifest(tempDir, manifest);
      const read = readManifest(tempDir);

      expect(read).toEqual(manifest);
    });

    test("returns null when manifest does not exist", () => {
      const result = readManifest(tempDir);

      expect(result).toBeNull();
    });

    test("returns null for invalid manifest JSON", () => {
      writeFileSync(join(tempDir, "gsd-pp-manifest.json"), "not json");

      const result = readManifest(tempDir);

      expect(result).toBeNull();
    });
  });

  describe("detectConflicts", () => {
    test("returns empty when all files match", () => {
      const file = join(tempDir, "test.md");
      writeFileSync(file, "content");
      const hash = computeFileHash(file);

      const manifest = createManifest("0.1.0", "1.22.4", {
        "test.md": hash,
      });

      const conflicts = detectConflicts(tempDir, manifest);

      expect(conflicts).toEqual([]);
    });

    test("detects missing files", () => {
      const manifest = createManifest("0.1.0", "1.22.4", {
        "missing.md": "abc123",
      });

      const conflicts = detectConflicts(tempDir, manifest);

      expect(conflicts).toEqual([
        { path: "missing.md", reason: "missing" },
      ]);
    });

    test("detects locally modified files", () => {
      const file = join(tempDir, "test.md");
      writeFileSync(file, "original");
      const originalHash = computeFileHash(file);

      const manifest = createManifest("0.1.0", "1.22.4", {
        "test.md": originalHash,
      });

      writeFileSync(file, "modified");

      const conflicts = detectConflicts(tempDir, manifest);

      expect(conflicts).toEqual([
        { path: "test.md", reason: "modified_locally" },
      ]);
    });
  });
});

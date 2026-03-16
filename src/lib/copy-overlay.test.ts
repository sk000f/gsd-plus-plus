import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyOverlayFiles } from "./copy-overlay.ts";

describe("copyOverlayFiles", () => {
  let tempDir: string;
  let packageDir: string;
  let projectDir: string;
  let claudeDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gsdpp-copy-"));
    packageDir = join(tempDir, "package");
    projectDir = join(tempDir, "project");
    claudeDir = join(projectDir, ".claude");

    mkdirSync(claudeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("copies agent files to .claude/agents/", () => {
    mkdirSync(join(packageDir, "agents"), { recursive: true });
    writeFileSync(
      join(packageDir, "agents", "gsd-code-reviewer.md"),
      "# reviewer",
    );

    const result = copyOverlayFiles(packageDir, claudeDir, projectDir);

    expect(result.success).toBe(true);
    expect(
      existsSync(join(claudeDir, "agents", "gsd-code-reviewer.md")),
    ).toBe(true);
    expect(
      readFileSync(join(claudeDir, "agents", "gsd-code-reviewer.md"), "utf-8"),
    ).toBe("# reviewer");
  });

  test("copies command files to .claude/commands/gsd/", () => {
    mkdirSync(join(packageDir, "commands", "gsd"), { recursive: true });
    writeFileSync(
      join(packageDir, "commands", "gsd", "review-phase.md"),
      "# review",
    );

    const result = copyOverlayFiles(packageDir, claudeDir, projectDir);

    expect(result.success).toBe(true);
    expect(
      existsSync(join(claudeDir, "commands", "gsd", "review-phase.md")),
    ).toBe(true);
  });

  test("copies workflow files to .claude/get-shit-done/workflows/", () => {
    mkdirSync(join(packageDir, "get-shit-done", "workflows"), {
      recursive: true,
    });
    writeFileSync(
      join(packageDir, "get-shit-done", "workflows", "review-phase.md"),
      "# workflow",
    );

    const result = copyOverlayFiles(packageDir, claudeDir, projectDir);

    expect(result.success).toBe(true);
    expect(
      existsSync(
        join(claudeDir, "get-shit-done", "workflows", "review-phase.md"),
      ),
    ).toBe(true);
  });

  test("returns file hashes for all copied files", () => {
    mkdirSync(join(packageDir, "agents"), { recursive: true });
    writeFileSync(join(packageDir, "agents", "test.md"), "content");

    const result = copyOverlayFiles(packageDir, claudeDir, projectDir);

    expect(Object.keys(result.fileHashes)).toHaveLength(1);
    const hashKey = Object.keys(result.fileHashes)[0];
    expect(result.fileHashes[hashKey]).toHaveLength(64);
  });

  test("handles missing source directories gracefully", () => {
    mkdirSync(packageDir, { recursive: true });

    const result = copyOverlayFiles(packageDir, claudeDir, projectDir);

    expect(result.success).toBe(true);
    expect(result.filesCopied).toHaveLength(0);
  });
});

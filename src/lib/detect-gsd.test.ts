import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectGsd } from "./detect-gsd.ts";

describe("detectGsd", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gsdpp-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns found=false when no .claude directory exists", () => {
    const result = detectGsd(tempDir);

    expect(result.found).toBe(false);
  });

  test("returns found=false when .claude exists but no get-shit-done", () => {
    mkdirSync(join(tempDir, ".claude"), { recursive: true });

    const result = detectGsd(tempDir);

    expect(result.found).toBe(false);
  });

  test("returns found=false when VERSION file is missing", () => {
    mkdirSync(join(tempDir, ".claude", "get-shit-done"), { recursive: true });

    const result = detectGsd(tempDir);

    expect(result.found).toBe(false);
  });

  test("returns found=true with correct paths when GSD is installed", () => {
    const gsdDir = join(tempDir, ".claude", "get-shit-done");
    mkdirSync(gsdDir, { recursive: true });
    writeFileSync(join(gsdDir, "VERSION"), "1.22.4\n");

    const result = detectGsd(tempDir);

    expect(result.found).toBe(true);
    expect(result.version).toBe("1.22.4");
    expect(result.claudeDir).toBe(join(tempDir, ".claude"));
    expect(result.gsdDir).toBe(gsdDir);
  });

  test("trims whitespace from version string", () => {
    const gsdDir = join(tempDir, ".claude", "get-shit-done");
    mkdirSync(gsdDir, { recursive: true });
    writeFileSync(join(gsdDir, "VERSION"), "  1.23.0\n  ");

    const result = detectGsd(tempDir);

    expect(result.version).toBe("1.23.0");
  });

  test("returns found=false when version is below minimum", () => {
    const gsdDir = join(tempDir, ".claude", "get-shit-done");
    mkdirSync(gsdDir, { recursive: true });
    writeFileSync(join(gsdDir, "VERSION"), "1.21.9\n");

    const result = detectGsd(tempDir);

    expect(result.found).toBe(false);
  });

  test("accepts exactly the minimum version 1.22.0", () => {
    const gsdDir = join(tempDir, ".claude", "get-shit-done");
    mkdirSync(gsdDir, { recursive: true });
    writeFileSync(join(gsdDir, "VERSION"), "1.22.0\n");

    const result = detectGsd(tempDir);

    expect(result.found).toBe(true);
    expect(result.version).toBe("1.22.0");
  });
});

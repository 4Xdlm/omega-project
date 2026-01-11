/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — CONNECTORS TESTS
 * Version: 0.4.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MockFilesystemConnector,
  createMockFilesystem,
  createFilesystemConnector,
  MockCLIConnector,
  createMockCLI,
  parseCommandLineArgs
} from "../src/connectors/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FILESYSTEM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Connectors — MockFilesystem", () => {
  let fs: MockFilesystemConnector;

  beforeEach(() => {
    fs = createMockFilesystem();
  });

  it("should create empty mock filesystem", () => {
    expect(fs.type).toBe("mock");
    expect(fs.getAllFiles().size).toBe(0);
  });

  it("should create with initial files", () => {
    const fs2 = createMockFilesystem({
      "/test.txt": "Hello",
      "/dir/file.txt": "World"
    });
    expect(fs2.getAllFiles().size).toBe(2);
  });

  it("should write and read files", async () => {
    await fs.writeFile("/test.txt", "Hello World");
    const content = await fs.readFile("/test.txt");
    expect(content).toBe("Hello World");
  });

  it("should throw on read non-existent file", async () => {
    await expect(fs.readFile("/missing.txt")).rejects.toThrow("ENOENT");
  });

  it("should check file exists", async () => {
    await fs.writeFile("/exists.txt", "content");
    expect(await fs.exists("/exists.txt")).toBe(true);
    expect(await fs.exists("/missing.txt")).toBe(false);
  });

  it("should list files in directory", async () => {
    await fs.writeFile("/dir/a.txt", "a");
    await fs.writeFile("/dir/b.txt", "b");
    await fs.writeFile("/other/c.txt", "c");

    const files = await fs.listFiles("/dir");
    expect(files).toHaveLength(2);
  });

  it("should filter files by pattern", async () => {
    await fs.writeFile("/dir/test.txt", "a");
    await fs.writeFile("/dir/test.json", "b");
    await fs.writeFile("/dir/other.txt", "c");

    const txtFiles = await fs.listFiles("/dir", "*.txt");
    expect(txtFiles.every(f => f.endsWith(".txt"))).toBe(true);
  });

  it("should create directories", async () => {
    await fs.mkdir("/new/nested/dir");
    expect(await fs.exists("/new/nested/dir")).toBe(true);
  });

  it("should clear all files", async () => {
    await fs.writeFile("/a.txt", "a");
    await fs.writeFile("/b.txt", "b");
    fs.clear();
    expect(fs.getAllFiles().size).toBe(0);
  });

  it("should set file directly", () => {
    fs.setFile("/direct.txt", "direct content");
    expect(fs.getAllFiles().has("/direct.txt")).toBe(true);
  });

  it("should normalize paths", async () => {
    await fs.writeFile("/Dir/File.TXT", "content");
    const content = await fs.readFile("/dir/file.txt");
    expect(content).toBe("content");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK CLI TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Connectors — MockCLI", () => {
  let cli: MockCLIConnector;

  beforeEach(() => {
    cli = createMockCLI();
  });

  it("should create mock CLI", () => {
    expect(cli.type).toBe("mock");
  });

  it("should capture stdout", () => {
    cli.print("Hello");
    cli.print("World");
    const output = cli.getOutput();
    expect(output.stdout).toEqual(["Hello", "World"]);
  });

  it("should capture stderr", () => {
    cli.printError("Error 1");
    cli.printError("Error 2");
    const output = cli.getOutput();
    expect(output.stderr).toEqual(["Error 1", "Error 2"]);
  });

  it("should capture exit code", () => {
    expect(cli.didExit()).toBe(false);
    cli.exit(1);
    expect(cli.didExit()).toBe(true);
    expect(cli.getExitCode()).toBe(1);
  });

  it("should return prompt responses", async () => {
    cli.setPromptResponses(["yes", "no"]);
    expect(await cli.prompt("Continue?")).toBe("yes");
    expect(await cli.prompt("Sure?")).toBe("no");
    expect(await cli.prompt("Again?")).toBe("");
  });

  it("should clear output", () => {
    cli.print("test");
    cli.printError("error");
    cli.exit(0);
    cli.clear();

    const output = cli.getOutput();
    expect(output.stdout).toHaveLength(0);
    expect(output.stderr).toHaveLength(0);
    expect(output.exitCode).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Connectors — parseCommandLineArgs", () => {
  it("should parse command", () => {
    const args = parseCommandLineArgs(["analyze"]);
    expect(args.command).toBe("analyze");
  });

  it("should parse input flag", () => {
    const args = parseCommandLineArgs(["--input", "/path/to/file.txt"]);
    expect(args.input).toBe("/path/to/file.txt");
  });

  it("should parse short input flag", () => {
    const args = parseCommandLineArgs(["-i", "/path/to/file.txt"]);
    expect(args.input).toBe("/path/to/file.txt");
  });

  it("should parse output flag", () => {
    const args = parseCommandLineArgs(["--output", "/output.json"]);
    expect(args.output).toBe("/output.json");
  });

  it("should parse seed flag", () => {
    const args = parseCommandLineArgs(["--seed", "42"]);
    expect(args.seed).toBe(42);
  });

  it("should parse format flag", () => {
    const args = parseCommandLineArgs(["--format", "json"]);
    expect(args.format).toBe("json");
  });

  it("should parse verbose flag", () => {
    const args = parseCommandLineArgs(["--verbose"]);
    expect(args.verbose).toBe(true);
    expect(args.flags.has("verbose")).toBe(true);
  });

  it("should parse quiet flag", () => {
    const args = parseCommandLineArgs(["-q"]);
    expect(args.quiet).toBe(true);
    expect(args.flags.has("quiet")).toBe(true);
  });

  it("should parse help flag", () => {
    const args = parseCommandLineArgs(["--help"]);
    expect(args.flags.has("help")).toBe(true);
  });

  it("should parse version flag", () => {
    const args = parseCommandLineArgs(["--version"]);
    expect(args.flags.has("version")).toBe(true);
  });

  it("should parse positional arguments", () => {
    const args = parseCommandLineArgs(["analyze", "file1.txt", "file2.txt"]);
    expect(args.command).toBe("analyze");
    expect(args.positional).toEqual(["file1.txt", "file2.txt"]);
  });

  it("should parse combined flags", () => {
    const args = parseCommandLineArgs([
      "analyze",
      "-i", "input.txt",
      "-o", "output.json",
      "--seed", "42",
      "-v"
    ]);
    expect(args.command).toBe("analyze");
    expect(args.input).toBe("input.txt");
    expect(args.output).toBe("output.json");
    expect(args.seed).toBe(42);
    expect(args.verbose).toBe(true);
  });

  it("should preserve raw args", () => {
    const rawArgs = ["cmd", "-a", "-b", "value"];
    const args = parseCommandLineArgs(rawArgs);
    expect(args.raw).toEqual(rawArgs);
  });

  it("should handle generic flags", () => {
    const args = parseCommandLineArgs(["--custom-flag", "-x"]);
    expect(args.flags.has("custom-flag")).toBe(true);
    expect(args.flags.has("x")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Connectors — Integration", () => {
  it("should use mock filesystem for testing", async () => {
    const fs = createMockFilesystem({
      "/input.txt": "Test content for analysis"
    });

    const content = await fs.readFile("/input.txt");
    expect(content).toBe("Test content for analysis");

    await fs.writeFile("/output.json", '{"result": "success"}');
    expect(await fs.exists("/output.json")).toBe(true);
  });

  it("should simulate CLI workflow", () => {
    const cli = createMockCLI();
    const args = cli.parseArgs([
      "analyze",
      "-i", "/input.txt",
      "-o", "/output.json",
      "--verbose"
    ]);

    expect(args.command).toBe("analyze");
    expect(args.input).toBe("/input.txt");
    expect(args.verbose).toBe(true);

    cli.print("Starting analysis...");
    cli.print("Analysis complete.");
    cli.exit(0);

    const output = cli.getOutput();
    expect(output.stdout).toHaveLength(2);
    expect(output.exitCode).toBe(0);
  });
});

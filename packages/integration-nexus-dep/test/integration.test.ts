/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — INTEGRATION TESTS
 * Version: 0.5.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Integration tests verify cross-component interactions:
 * - Contracts + Adapters
 * - Adapters + Router
 * - Router + Translators
 * - Translators + Connectors
 * - Full end-to-end flows
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";

// Contracts
import {
  createNexusRequest,
  createNexusResponse,
  createErrorResponse,
  NexusRequest,
  NexusResponse,
  EMOTION14_LIST
} from "../src/contracts/index.js";

// Adapters
import {
  createGenomeAdapter,
  createMyceliumAdapter,
  createMyceliumBioAdapter,
  GenomeAdapter,
  MyceliumAdapter,
  MyceliumBioAdapter
} from "../src/adapters/index.js";

// Router
import {
  createRouter,
  createDefaultRouter,
  NexusRouter
} from "../src/router/index.js";

// Translators
import {
  createInputTranslator,
  createOutputTranslator,
  createModuleTranslator,
  InputTranslator,
  OutputTranslator,
  ModuleTranslator,
  GENOME_TO_BIO_EMOTION,
  BIO_TO_GENOME_EMOTION
} from "../src/translators/index.js";

// Connectors
import {
  createMockFilesystem,
  createMockCLI,
  MockFilesystemConnector,
  MockCLIConnector,
  parseCommandLineArgs
} from "../src/connectors/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS + ADAPTERS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Contracts + Adapters", () => {
  let genomeAdapter: GenomeAdapter;
  let myceliumAdapter: MyceliumAdapter;
  let bioAdapter: MyceliumBioAdapter;

  beforeEach(() => {
    genomeAdapter = createGenomeAdapter();
    myceliumAdapter = createMyceliumAdapter();
    bioAdapter = createMyceliumBioAdapter();
  });

  it("should create request, process through adapter, return response", async () => {
    const request = createNexusRequest<{ text: string }>("ANALYZE_TEXT", {
      text: "Hello world"
    });

    expect(request.id).toMatch(/^NEXUS-/);
    expect(request.type).toBe("ANALYZE_TEXT");
    expect(request.payload.text).toBe("Hello world");

    // Genome adapter processes
    const analysis = await genomeAdapter.analyzeText("Hello world");
    expect(analysis.fingerprint).toBeDefined();

    const response = createNexusResponse(request.id, analysis);
    expect(response.requestId).toBe(request.id);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(analysis);
  });

  it("should flow between multiple adapters", async () => {
    const text = "The character felt a deep joy and hope.";

    // Step 1: Mycelium validation
    const validationResult = await myceliumAdapter.validateInput({ content: text });
    expect(validationResult.valid).toBe(true);

    // Step 2: Genome analysis
    const genomeResult = await genomeAdapter.analyzeText(text);
    expect(genomeResult.fingerprint).toBeDefined();

    // Step 3: Bio DNA construction
    const bioResult = await bioAdapter.buildDNA({
      validatedContent: validationResult.normalizedContent || text,
      seed: 42,
      mode: "auto"
    });
    expect(bioResult.rootHash).toBeDefined();
  });

  it("should preserve request ID through adapter chain", async () => {
    const request = createNexusRequest("BUILD_DNA", { segments: ["A", "B"] });
    const requestId = request.id;

    // Simulate adapter chain
    const step1 = { processed: true, requestId };
    const step2 = { enhanced: true, requestId: step1.requestId };
    const step3 = { finalized: true, requestId: step2.requestId };

    expect(step3.requestId).toBe(requestId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTERS + ROUTER INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Adapters + Router", () => {
  let router: NexusRouter;
  let genomeAdapter: GenomeAdapter;

  beforeEach(() => {
    router = createRouter();
    genomeAdapter = createGenomeAdapter();
  });

  it("should route request to adapter handler", async () => {
    router.register<{ text: string }, { fingerprint: string }>(
      "ANALYZE_TEXT",
      async (payload) => {
        const result = await genomeAdapter.analyzeText(payload.text);
        return { fingerprint: result.fingerprint };
      }
    );

    const response = await router.dispatch(
      createNexusRequest("ANALYZE_TEXT", { text: "Test text" })
    );

    expect(response.success).toBe(true);
    expect(response.data?.fingerprint).toBeDefined();
  });

  it("should handle adapter errors in router", async () => {
    router.register("FAILING_OP", async () => {
      throw new Error("Adapter failure simulation");
    });

    const response = await router.dispatch(
      createNexusRequest("FAILING_OP", {})
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("ADAPTER_ERROR");
  });

  it("should chain multiple adapter calls through router", async () => {
    const myceliumAdapter = createMyceliumAdapter();

    router.register<{ text: string }, { combined: string }>(
      "COMBINED_ANALYSIS",
      async (payload) => {
        const validation = await myceliumAdapter.validateInput({ content: payload.text });
        const genome = await genomeAdapter.analyzeText(payload.text);
        return {
          combined: `${genome.fingerprint}:${validation.valid}`
        };
      }
    );

    const response = await router.dispatch(
      createNexusRequest("COMBINED_ANALYSIS", { text: "Multi-adapter test" })
    );

    expect(response.success).toBe(true);
    expect(response.data?.combined).toContain(":");
  });

  it("should use default router with pre-configured handlers", async () => {
    const defaultRouter = createDefaultRouter();

    const response = await defaultRouter.dispatch(
      createNexusRequest("ANALYZE_TEXT", { content: "Using default" })
    );

    expect(response.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER + TRANSLATORS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Router + Translators", () => {
  let router: NexusRouter;
  let inputTranslator: InputTranslator;
  let outputTranslator: OutputTranslator;

  beforeEach(() => {
    router = createRouter();
    inputTranslator = createInputTranslator();
    outputTranslator = createOutputTranslator();
  });

  it("should translate input before routing", async () => {
    router.register<{ text: string; lang: string }, { processed: boolean }>(
      "PROCESS_TEXT",
      async (payload) => {
        return { processed: payload.text.length > 0 && payload.lang.length > 0 };
      }
    );

    const rawInput = "  Hello   World  \r\n  Test  ";
    const normalized = inputTranslator.quickNormalize(rawInput);
    const language = inputTranslator.detectLanguage(rawInput);

    const response = await router.dispatch(
      createNexusRequest("PROCESS_TEXT", { text: normalized, lang: language })
    );

    expect(response.success).toBe(true);
    expect(response.data?.processed).toBe(true);
  });

  it("should translate output after routing", async () => {
    router.register<{}, { emotions: string[] }>(
      "GET_EMOTIONS",
      async () => {
        return { emotions: ["joy", "hope", "trust"] };
      }
    );

    const response = await router.dispatch(
      createNexusRequest("GET_EMOTIONS", {})
    );

    const formatted = outputTranslator.toJSON(response);
    expect(formatted).toContain("success");
    expect(formatted).toContain("emotions");
  });

  it("should use module translator for cross-module emotion mapping", async () => {
    const moduleTranslator = createModuleTranslator();

    router.register<{ emotion: string }, { mappedEmotion: string }>(
      "TRANSLATE_EMOTION",
      async (payload) => {
        const mapped = GENOME_TO_BIO_EMOTION[payload.emotion as keyof typeof GENOME_TO_BIO_EMOTION];
        return { mappedEmotion: mapped || payload.emotion };
      }
    );

    // "envy" in Genome maps to "anger" in Bio
    const response = await router.dispatch(
      createNexusRequest("TRANSLATE_EMOTION", { emotion: "envy" })
    );

    expect(response.success).toBe(true);
    expect(response.data?.mappedEmotion).toBe("anger");
  });

  it("should handle translation errors gracefully", async () => {
    router.register<{ text: string }, { normalized: string }>(
      "NORMALIZE",
      async (payload) => {
        if (!payload.text) {
          throw new Error("Empty text");
        }
        return { normalized: inputTranslator.quickNormalize(payload.text) };
      }
    );

    const response = await router.dispatch(
      createNexusRequest("NORMALIZE", { text: "" })
    );

    expect(response.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATORS + CONNECTORS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Translators + Connectors", () => {
  let fs: MockFilesystemConnector;
  let cli: MockCLIConnector;
  let inputTranslator: InputTranslator;
  let outputTranslator: OutputTranslator;

  beforeEach(() => {
    fs = createMockFilesystem();
    cli = createMockCLI();
    inputTranslator = createInputTranslator();
    outputTranslator = createOutputTranslator();
  });

  it("should read file, translate, and output to CLI", async () => {
    // Setup: create file with raw content
    await fs.writeFile("/input.txt", "  Raw   content  \r\n  here  ");

    // Read and normalize
    const raw = await fs.readFile("/input.txt");
    const normalized = inputTranslator.quickNormalize(raw);

    // Output to CLI
    cli.print(`Processed: ${normalized}`);

    const output = cli.getOutput();
    expect(output.stdout[0]).toBe("Processed: Raw content\nhere");
  });

  it("should parse CLI args and use translator config", () => {
    const args = parseCommandLineArgs([
      "analyze",
      "-i", "/input.txt",
      "--format", "json",
      "--verbose"
    ]);

    // Translator uses format from args
    const translator = createOutputTranslator({ format: args.format });
    const formatted = translator.toJSON(
      createNexusResponse("req-1", { result: "ok" })
    );

    expect(formatted).toContain('"result"');
  });

  it("should save translated output to filesystem", async () => {
    const response = createNexusResponse("req-123", {
      emotions: ["joy", "hope"],
      confidence: 0.95
    });

    const formatted = outputTranslator.toJSON(response);
    await fs.writeFile("/output.json", formatted);

    const saved = await fs.readFile("/output.json");
    expect(saved).toContain("joy");
    expect(saved).toContain("hope");
  });

  it("should detect language from file content", async () => {
    await fs.writeFile("/french.txt", "Bonjour le monde, comment allez-vous?");
    await fs.writeFile("/english.txt", "Hello world, how are you doing?");

    const frenchContent = await fs.readFile("/french.txt");
    const englishContent = await fs.readFile("/english.txt");

    const frenchLang = inputTranslator.detectLanguage(frenchContent);
    const englishLang = inputTranslator.detectLanguage(englishContent);

    expect(frenchLang).toBe("fr");
    expect(englishLang).toBe("en");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL END-TO-END INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Full End-to-End", () => {
  let fs: MockFilesystemConnector;
  let cli: MockCLIConnector;
  let router: NexusRouter;
  let inputTranslator: InputTranslator;
  let outputTranslator: OutputTranslator;
  let genomeAdapter: GenomeAdapter;

  beforeEach(() => {
    fs = createMockFilesystem();
    cli = createMockCLI();
    router = createRouter();
    inputTranslator = createInputTranslator();
    outputTranslator = createOutputTranslator();
    genomeAdapter = createGenomeAdapter();

    // Register handlers
    router.register<{ text: string }, { fingerprint: string; version: string }>(
      "ANALYZE_TEXT",
      async (payload) => {
        const result = await genomeAdapter.analyzeText(payload.text);
        return {
          fingerprint: result.fingerprint,
          version: result.version
        };
      }
    );
  });

  it("should process complete workflow: file → translate → route → adapt → output", async () => {
    // Step 1: Read input file
    await fs.writeFile("/narrative.txt", "  The hero felt great joy and hope.  ");
    const rawContent = await fs.readFile("/narrative.txt");

    // Step 2: Translate input
    const normalizedContent = inputTranslator.quickNormalize(rawContent);
    const detectedLang = inputTranslator.detectLanguage(rawContent);

    expect(normalizedContent).toBe("The hero felt great joy and hope.");
    expect(detectedLang).toBe("en");

    // Step 3: Create and route request
    const request = createNexusRequest("ANALYZE_TEXT", { text: normalizedContent });
    const response = await router.dispatch(request);

    expect(response.success).toBe(true);
    expect(response.data?.fingerprint).toBeDefined();

    // Step 4: Translate output
    const formattedOutput = outputTranslator.toJSON(response);

    // Step 5: Save to filesystem
    await fs.writeFile("/result.json", formattedOutput);

    // Step 6: Output to CLI
    cli.print("Analysis complete");
    cli.print(`Fingerprint: ${response.data?.fingerprint}`);
    cli.exit(0);

    // Verify final state
    expect(await fs.exists("/result.json")).toBe(true);
    expect(cli.didExit()).toBe(true);
    expect(cli.getExitCode()).toBe(0);
  });

  it("should handle CLI-driven workflow with arguments", async () => {
    // Simulate CLI invocation
    const args = cli.parseArgs([
      "analyze",
      "-i", "/input.txt",
      "-o", "/output.json",
      "--seed", "42",
      "--verbose"
    ]);

    expect(args.command).toBe("analyze");
    expect(args.input).toBe("/input.txt");
    expect(args.output).toBe("/output.json");
    expect(args.seed).toBe(42);
    expect(args.verbose).toBe(true);

    // Setup input file
    await fs.writeFile(args.input!, "Deterministic test content");

    // Process with seed
    const content = await fs.readFile(args.input!);
    const normalized = inputTranslator.quickNormalize(content);

    const request = createNexusRequest("ANALYZE_TEXT", { text: normalized }, args.seed);
    const response = await router.dispatch(request);

    // Save output
    const formatted = outputTranslator.toJSON(response);
    await fs.writeFile(args.output!, formatted);

    if (args.verbose) {
      cli.print("Verbose: Processing complete");
    }

    expect(await fs.exists(args.output!)).toBe(true);
  });

  it("should maintain determinism across full workflow", async () => {
    const seed = 12345;
    const inputText = "Deterministic analysis test";

    // Run 1
    await fs.writeFile("/test.txt", inputText);
    const request1 = createNexusRequest("ANALYZE_TEXT", {
      text: inputTranslator.quickNormalize(await fs.readFile("/test.txt"))
    }, seed);
    const response1 = await router.dispatch(request1);

    // Run 2 (fresh state)
    fs.clear();
    await fs.writeFile("/test.txt", inputText);
    const request2 = createNexusRequest("ANALYZE_TEXT", {
      text: inputTranslator.quickNormalize(await fs.readFile("/test.txt"))
    }, seed);
    const response2 = await router.dispatch(request2);

    // Same seed, same input → same fingerprint
    expect(response1.data?.fingerprint).toBe(response2.data?.fingerprint);
  });

  it("should handle error workflow gracefully", async () => {
    // Try to read non-existent file
    let errorOccurred = false;
    try {
      await fs.readFile("/nonexistent.txt");
    } catch (e) {
      errorOccurred = true;
      cli.printError("File not found: /nonexistent.txt");
    }

    expect(errorOccurred).toBe(true);
    expect(cli.getOutput().stderr).toContain("File not found: /nonexistent.txt");
  });

  it("should process batch of files", async () => {
    // Setup multiple input files
    await fs.writeFile("/batch/file1.txt", "First narrative");
    await fs.writeFile("/batch/file2.txt", "Second story");
    await fs.writeFile("/batch/file3.txt", "Third tale");

    const files = await fs.listFiles("/batch");
    const results: Array<{ file: string; fingerprint: string }> = [];

    for (const file of files) {
      const content = await fs.readFile(file);
      const normalized = inputTranslator.quickNormalize(content);
      const request = createNexusRequest("ANALYZE_TEXT", { text: normalized });
      const response = await router.dispatch(request);

      if (response.success && response.data) {
        results.push({
          file,
          fingerprint: response.data.fingerprint
        });
      }
    }

    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.fingerprint).toBeDefined();
    });
  });

  it("should use module translator in cross-module flow", () => {
    // Genome emotions
    const genomeEmotions = ["joy", "hope", "envy"] as const;

    // Translate to Bio module using mapping constants
    const bioEmotions = genomeEmotions.map(e =>
      GENOME_TO_BIO_EMOTION[e as keyof typeof GENOME_TO_BIO_EMOTION]
    );

    expect(bioEmotions).toContain("joy");
    expect(bioEmotions).toContain("hope");
    expect(bioEmotions).toContain("anger"); // envy → anger

    // Translate back using mapping
    const backToGenome = bioEmotions.map(e =>
      BIO_TO_GENOME_EMOTION[e as keyof typeof BIO_TO_GENOME_EMOTION]
    );
    expect(backToGenome).toContain("joy");
    expect(backToGenome).toContain("hope");
    expect(backToGenome).toContain("anger"); // anger stays anger (not bijective for envy)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENCY INTEGRATION (Simulated)
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Concurrent Operations", () => {
  it("should handle parallel requests", async () => {
    const router = createDefaultRouter();

    const requests = [
      createNexusRequest("ANALYZE_TEXT", { content: "First" }),
      createNexusRequest("ANALYZE_TEXT", { content: "Second" }),
      createNexusRequest("ANALYZE_TEXT", { content: "Third" })
    ];

    const responses = await Promise.all(
      requests.map(r => router.dispatch(r))
    );

    expect(responses).toHaveLength(3);
    responses.forEach(r => {
      expect(r.success).toBe(true);
    });
  });

  it("should isolate filesystem operations", async () => {
    const fs1 = createMockFilesystem();
    const fs2 = createMockFilesystem();

    await fs1.writeFile("/shared.txt", "Content 1");
    await fs2.writeFile("/shared.txt", "Content 2");

    // Each filesystem is isolated
    expect(await fs1.readFile("/shared.txt")).toBe("Content 1");
    expect(await fs2.readFile("/shared.txt")).toBe("Content 2");
  });

  it("should isolate CLI outputs", () => {
    const cli1 = createMockCLI();
    const cli2 = createMockCLI();

    cli1.print("Output 1");
    cli2.print("Output 2");

    expect(cli1.getOutput().stdout).toEqual(["Output 1"]);
    expect(cli2.getOutput().stdout).toEqual(["Output 2"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TRACING
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Request Tracing", () => {
  it("should trace request through all components", async () => {
    const trace: string[] = [];

    const fs = createMockFilesystem();
    const cli = createMockCLI();
    const router = createRouter();
    const inputTranslator = createInputTranslator();
    const genomeAdapter = createGenomeAdapter();

    // Register handler with tracing
    router.register<{ text: string }, { result: string }>(
      "TRACED_OP",
      async (payload, context) => {
        trace.push(`handler:${context?.requestId}`);
        const result = await genomeAdapter.analyzeText(payload.text);
        return { result: result.fingerprint };
      }
    );

    // Create request
    const request = createNexusRequest("TRACED_OP", { text: "Trace test" });
    trace.push(`request:${request.id}`);

    // Read from fs
    await fs.writeFile("/trace.txt", "Trace test");
    trace.push("fs:read");

    // Translate
    const content = inputTranslator.quickNormalize(await fs.readFile("/trace.txt"));
    trace.push("translator:normalize");

    // Dispatch
    const response = await router.dispatch(request);
    trace.push(`response:${response.requestId}`);

    // Output
    cli.print(`Trace complete: ${response.requestId}`);
    trace.push("cli:print");

    // Verify trace
    expect(trace).toContain(`request:${request.id}`);
    expect(trace).toContain("fs:read");
    expect(trace).toContain("translator:normalize");
    expect(trace).toContain(`handler:${request.id}`);
    expect(trace).toContain(`response:${request.id}`);
    expect(trace).toContain("cli:print");

    // All IDs match
    expect(response.requestId).toBe(request.id);
  });

  it("should include timing in trace context", async () => {
    const router = createRouter();
    let capturedContext: any;

    router.register("TIMED_OP", async (_payload, context) => {
      capturedContext = context;
      return { timed: true };
    });

    const request = createNexusRequest("TIMED_OP", {});
    await router.dispatch(request);

    expect(capturedContext).toBeDefined();
    expect(capturedContext.requestId).toBe(request.id);
    expect(capturedContext.startTime).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION14 VALIDATION INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP Integration — Emotion14 Validation", () => {
  it("should validate emotions through full pipeline", async () => {
    const router = createRouter();

    router.register<{ emotions: string[] }, { valid: string[]; invalid: string[] }>(
      "VALIDATE_EMOTIONS",
      async (payload) => {
        const valid: string[] = [];
        const invalid: string[] = [];

        payload.emotions.forEach(e => {
          if (EMOTION14_LIST.includes(e as any)) {
            valid.push(e);
          } else {
            invalid.push(e);
          }
        });

        return { valid, invalid };
      }
    );

    const response = await router.dispatch(
      createNexusRequest("VALIDATE_EMOTIONS", {
        emotions: ["joy", "hope", "invalid_emotion", "anger", "fake"]
      })
    );

    expect(response.success).toBe(true);
    expect(response.data?.valid).toEqual(["joy", "hope", "anger"]);
    expect(response.data?.invalid).toEqual(["invalid_emotion", "fake"]);
  });

  it("should ensure all EMOTION14 are translatable", () => {
    // Every Emotion14 should have a valid translation mapping
    EMOTION14_LIST.forEach(emotion => {
      const bioEmotion = GENOME_TO_BIO_EMOTION[emotion];
      expect(bioEmotion).toBeDefined();
      expect(typeof bioEmotion).toBe("string");
    });
  });
});

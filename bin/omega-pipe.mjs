#!/usr/bin/env node
/**
 * OMEGA Pipeline Entry Point
 *
 * Pure stdout for Unix pipelines (no npm prefix noise).
 *
 * Usage:
 *   cat file.txt | node tools/omega-pipe.mjs analyze --stdin --lang fr --stream
 *   node tools/omega-pipe.mjs analyze --stdin --stream < input.txt > output.ndjson
 */

import { main } from '../gateway/cli-runner/dist/cli/runner.js';

main(process.argv.slice(2));

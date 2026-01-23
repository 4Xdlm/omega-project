/**
 * OMEGA Phase 7 — PNG Export
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 *
 * Exports SVG to PNG using Chromium headless (via Playwright).
 * Deterministic rendering guaranteed within RCE-01 environment.
 */

import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import type { RenderParams, PngResult } from './types.js';

/**
 * Calculate SHA-256 hash of buffer
 */
function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Export SVG to PNG using Chromium headless
 *
 * @param svg - SVG string to render
 * @param params - RenderParams from RCE-01 profile
 * @returns PngResult with buffer and hash
 *
 * DETERMINISM:
 * - Same SVG + Same RCE-01 environment → Same PNG
 * - GPU disabled for reproducibility
 * - Fixed viewport and device scale
 */
export async function exportPng(
  svg: string,
  params: RenderParams
): Promise<PngResult> {
  const { width, height } = params.viewport;
  const deviceScaleFactor = params.rendering.deviceScaleFactor;

  // Launch browser with deterministic settings
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-web-security',
      '--single-process',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
    ],
  });

  try {
    // Create page with fixed viewport
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor,
      colorScheme: 'light',
    });

    // Create HTML with embedded SVG
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: transparent;
    }
    svg {
      display: block;
      width: ${width}px;
      height: ${height}px;
    }
  </style>
</head>
<body>
${svg}
</body>
</html>`;

    // Set content and wait for rendering
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Take screenshot with deterministic settings
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width, height },
    });

    // Calculate hash
    const hash = sha256Buffer(buffer);

    return { buffer, hash };
  } finally {
    await browser.close();
  }
}

/**
 * Get Chromium version for reporting
 */
export async function getChromiumVersion(): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  try {
    const version = await browser.version();
    return version;
  } finally {
    await browser.close();
  }
}

/**
 * Get Playwright version for reporting
 */
export function getPlaywrightVersion(): string {
  // Version comes from package.json - read at build time
  return process.env.npm_package_dependencies_playwright || 'unknown';
}

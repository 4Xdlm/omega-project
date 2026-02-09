/**
 * OMEGA Governance — Badge Generator
 * Phase F — Generate CI status badges
 *
 * INV-F-09: Badge reflects the REAL gate verdict, never cached.
 */

import type { BadgeStatus, BadgeConfig, BadgeResult } from './types.js';
import type { CIResult } from '../types.js';

const COLORS: Readonly<Record<BadgeStatus, string>> = {
  passing: '#4c1',
  failing: '#e05d44',
  unknown: '#9f9f9f',
};

/** Generate badge from CI result */
export function generateBadge(result: CIResult): BadgeResult {
  const status: BadgeStatus = result.verdict === 'PASS' ? 'passing' : 'failing';
  const config: BadgeConfig = {
    label: 'OMEGA CI',
    status,
    color: COLORS[status],
  };

  return {
    svg: generateSVG(config),
    shield_url: generateShieldURL(config),
    alt_text: `OMEGA CI: ${status}`,
    status,
  };
}

/** Generate badge for unknown/pending state */
export function generateUnknownBadge(): BadgeResult {
  const config: BadgeConfig = {
    label: 'OMEGA CI',
    status: 'unknown',
    color: COLORS.unknown,
  };

  return {
    svg: generateSVG(config),
    shield_url: generateShieldURL(config),
    alt_text: 'OMEGA CI: unknown',
    status: 'unknown',
  };
}

function generateSVG(config: BadgeConfig): string {
  const labelWidth = config.label.length * 7 + 10;
  const statusText = config.status;
  const statusWidth = statusText.length * 7 + 10;
  const totalWidth = labelWidth + statusWidth;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">`,
    `  <linearGradient id="b" x2="0" y2="100%">`,
    `    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
    `    <stop offset="1" stop-opacity=".1"/>`,
    `  </linearGradient>`,
    `  <mask id="a">`,
    `    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>`,
    `  </mask>`,
    `  <g mask="url(#a)">`,
    `    <rect width="${labelWidth}" height="20" fill="#555"/>`,
    `    <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${config.color}"/>`,
    `    <rect width="${totalWidth}" height="20" fill="url(#b)"/>`,
    `  </g>`,
    `  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">`,
    `    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${config.label}</text>`,
    `    <text x="${labelWidth / 2}" y="14">${config.label}</text>`,
    `    <text x="${labelWidth + statusWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${statusText}</text>`,
    `    <text x="${labelWidth + statusWidth / 2}" y="14">${statusText}</text>`,
    `  </g>`,
    `</svg>`,
  ].join('\n');
}

function generateShieldURL(config: BadgeConfig): string {
  const label = encodeURIComponent(config.label);
  const status = encodeURIComponent(config.status);
  const color = config.color.replace('#', '');
  return `https://img.shields.io/badge/${label}-${status}-${color}`;
}

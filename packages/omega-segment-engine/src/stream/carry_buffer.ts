// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA STREAMING v2 — CARRY BUFFER & NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════
// Gestion des frontières de segments et normalisation newlines
// Standard: NASA-Grade L4
//
// CARRY BUFFER:
//   Conserve le "reste" d'un chunk qui ne forme pas un segment complet.
//   Ex: "Hello world. This is a sen" → carry = "This is a sen"
//
// NEWLINE NORMALIZER:
//   \r\n → \n (Windows)
//   \r → \n (old Mac)
//   Calcule les offsets sur le texte NORMALISÉ
//
// INVARIANTS:
//   INV-CARRY-01: Aucun segment perdu entre chunks
//   INV-NORM-01: Offsets toujours sur texte normalisé
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SegmentMode = "sentence" | "paragraph" | "scene";

export interface NormalizedChunk {
  /** Normalized text (\r\n → \n) */
  text: string;
  /** Offset in normalized stream (not raw bytes) */
  normalizedOffset: number;
}

export interface CarryResult {
  /** Complete segments found in this chunk */
  completeSegments: string[];
  /** Remaining text to carry to next chunk */
  carry: string;
  /** Offsets of complete segments [start, end] in normalized stream */
  segmentOffsets: Array<[number, number]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Scene separators (must be on their own line) */
const SCENE_SEPARATORS = ["###", "***", "---", "===", "~~~"];

/** Abbreviations that don't end sentences (FR + EN) */
const ABBREVIATIONS = new Set([
  // English
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "inc", "ltd",
  "st", "ave", "blvd", "dept", "est", "vol", "rev", "gen", "col", "lt",
  "sgt", "capt", "cmdr", "adm", "fig", "no", "nos", "approx", "govt",
  // French
  "m", "mme", "mlle", "mm", "dr", "pr", "me", "mgr", "st", "ste",
  "av", "bd", "etc", "cf", "fig", "vol", "n°", "p", "pp", "éd",
]);

// ─────────────────────────────────────────────────────────────────────────────
// NEWLINE NORMALIZER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes newlines in streaming fashion.
 * Handles \r\n and \r → \n conversion.
 * 
 * CRITICAL: Must handle \r at chunk boundary:
 *   Chunk 1: "Hello\r"
 *   Chunk 2: "\nWorld"
 *   → Should become "Hello\nWorld", not "Hello\n\nWorld"
 */
export class NewlineNormalizer {
  private pendingCR: boolean = false;
  private normalizedOffset: number = 0;
  
  /**
   * Normalizes a chunk of text.
   * Call with all chunks in order, then call flush() at the end.
   * 
   * @param rawText Raw text chunk
   * @returns Normalized chunk with offset
   */
  normalize(rawText: string): NormalizedChunk {
    let result = "";
    const startOffset = this.normalizedOffset;
    
    for (let i = 0; i < rawText.length; i++) {
      const char = rawText[i];
      
      if (this.pendingCR) {
        this.pendingCR = false;
        if (char === "\n") {
          // \r\n → \n (already emitted \n for the \r)
          continue;
        }
        // Standalone \r was already converted to \n
      }
      
      if (char === "\r") {
        this.pendingCR = true;
        result += "\n";
        this.normalizedOffset++;
      } else {
        result += char;
        this.normalizedOffset++;
      }
    }
    
    return {
      text: result,
      normalizedOffset: startOffset,
    };
  }
  
  /**
   * Flushes any pending state.
   * Call after processing all chunks.
   * 
   * @returns Any remaining normalized text
   */
  flush(): string {
    // If we ended with a \r, it was already converted to \n
    this.pendingCR = false;
    return "";
  }
  
  /**
   * Resets the normalizer state.
   */
  reset(): void {
    this.pendingCR = false;
    this.normalizedOffset = 0;
  }
  
  /**
   * Gets the current normalized offset.
   */
  getCurrentOffset(): number {
    return this.normalizedOffset;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARRY BUFFER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages segment boundaries across chunks.
 * 
 * The carry buffer holds incomplete segments between chunks.
 * Different modes have different boundary detection:
 * - paragraph: double newline (\n\n)
 * - scene: separator line (###, ***, ---, etc.)
 * - sentence: sentence-ending punctuation (. ! ?) with context
 */
export class CarryBuffer {
  private carry: string = "";
  private mode: SegmentMode;

  constructor(mode: SegmentMode) {
    this.mode = mode;
  }
  
  /**
   * Processes a normalized chunk and extracts complete segments.
   * 
   * @param chunk Normalized text chunk
   * @param chunkStartOffset Offset where this chunk starts in normalized stream
   * @param isLastChunk Is this the final chunk?
   * @returns Complete segments and remaining carry
   */
  process(
    chunk: string,
    chunkStartOffset: number,
    isLastChunk: boolean
  ): CarryResult {
    // Prepend carry from previous chunk
    const fullText = this.carry + chunk;
    const textStartOffset = chunkStartOffset - this.carry.length;
    
    const completeSegments: string[] = [];
    const segmentOffsets: Array<[number, number]> = [];

    let lastBoundary = 0;
    
    switch (this.mode) {
      case "paragraph":
        // Split on double newlines
        const paragraphRegex = /\n\n+/g;
        let match;
        while ((match = paragraphRegex.exec(fullText)) !== null) {
          const segmentText = fullText.slice(lastBoundary, match.index).trim();
          if (segmentText.length > 0) {
            completeSegments.push(segmentText);
            segmentOffsets.push([
              textStartOffset + lastBoundary,
              textStartOffset + match.index,
            ]);
          }
          lastBoundary = match.index + match[0].length;
        }
        break;
        
      case "scene":
        // Split on scene separators (on their own line)
        const lines = fullText.split("\n");
        let lineOffset = 0;
        let currentScene = "";
        let sceneStart = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          if (SCENE_SEPARATORS.includes(trimmedLine)) {
            // Found scene separator
            if (currentScene.trim().length > 0) {
              completeSegments.push(currentScene.trim());
              segmentOffsets.push([
                textStartOffset + sceneStart,
                textStartOffset + lineOffset - 1,
              ]);
            }
            currentScene = "";
            sceneStart = lineOffset + line.length + 1; // After separator
          } else {
            currentScene += (currentScene ? "\n" : "") + line;
          }
          
          lineOffset += line.length + 1; // +1 for newline
        }
        
        // Keep remaining as carry (not a complete scene yet)
        this.carry = currentScene;
        lastBoundary = fullText.length - currentScene.length;
        
        if (isLastChunk && currentScene.trim().length > 0) {
          completeSegments.push(currentScene.trim());
          segmentOffsets.push([
            textStartOffset + sceneStart,
            textStartOffset + fullText.length,
          ]);
          this.carry = "";
        }
        
        return { completeSegments, carry: this.carry, segmentOffsets };
        
      case "sentence":
        // Split on sentence-ending punctuation
        // But NOT after abbreviations
        const sentenceResult = this.extractSentences(
          fullText,
          textStartOffset,
          isLastChunk
        );
        return sentenceResult;
    }
    
    // For paragraph mode: set carry as remaining text
    this.carry = fullText.slice(lastBoundary);
    
    // If last chunk, emit remaining as final segment
    if (isLastChunk && this.carry.trim().length > 0) {
      completeSegments.push(this.carry.trim());
      segmentOffsets.push([
        textStartOffset + lastBoundary,
        textStartOffset + fullText.length,
      ]);
      this.carry = "";
    }
    
    return { completeSegments, carry: this.carry, segmentOffsets };
  }
  
  /**
   * Extracts sentences with abbreviation handling.
   */
  private extractSentences(
    text: string,
    startOffset: number,
    isLastChunk: boolean
  ): CarryResult {
    const completeSegments: string[] = [];
    const segmentOffsets: Array<[number, number]> = [];
    
    // Regex for potential sentence endings
    const endingRegex = /([.!?]+)(\s|$)/g;
    
    let lastEnd = 0;
    let match;
    
    while ((match = endingRegex.exec(text)) !== null) {
      const endPos = match.index + match[1].length;
      const beforeEnd = text.slice(Math.max(0, match.index - 20), match.index);
      
      // Check if this is an abbreviation
      const wordMatch = beforeEnd.match(/(\w+)$/);
      if (wordMatch) {
        const word = wordMatch[1].toLowerCase();
        if (ABBREVIATIONS.has(word)) {
          // This is an abbreviation, not a sentence end
          continue;
        }
      }
      
      // Check for decimal numbers (e.g., "3.14")
      if (match[1] === ".") {
        const beforeDot = text.slice(Math.max(0, match.index - 1), match.index);
        const afterDot = text.slice(match.index + 1, match.index + 2);
        if (/\d/.test(beforeDot) && /\d/.test(afterDot)) {
          // Decimal number, not sentence end
          continue;
        }
      }
      
      // This is a real sentence end
      const segmentText = text.slice(lastEnd, endPos).trim();
      if (segmentText.length > 0) {
        completeSegments.push(segmentText);
        segmentOffsets.push([
          startOffset + lastEnd,
          startOffset + endPos,
        ]);
      }
      lastEnd = endPos;
      
      // Skip whitespace
      while (lastEnd < text.length && /\s/.test(text[lastEnd])) {
        lastEnd++;
      }
    }
    
    // Remaining text becomes carry
    // For sentence mode, keep more context for abbreviation detection
    this.carry = text.slice(lastEnd);
    
    // If last chunk and there's remaining text, emit it
    if (isLastChunk && this.carry.trim().length > 0) {
      completeSegments.push(this.carry.trim());
      segmentOffsets.push([
        startOffset + lastEnd,
        startOffset + text.length,
      ]);
      this.carry = "";
    }
    
    return { completeSegments, carry: this.carry, segmentOffsets };
  }
  
  /**
   * Gets the current carry.
   */
  getCarry(): string {
    return this.carry;
  }
  
  /**
   * Resets the buffer state.
   */
  reset(): void {
    this.carry = "";
  }
}

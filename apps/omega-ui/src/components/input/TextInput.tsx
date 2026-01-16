/**
 * Text Input Component for OMEGA UI
 * @module components/input/TextInput
 * @description Enhanced text input with character/word counting
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Text input props
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  showStats?: boolean;
  autoFocus?: boolean;
  onAnalyze?: () => void;
}

/**
 * Text statistics
 */
interface TextStats {
  characters: number;
  words: number;
  sentences: number;
  paragraphs: number;
  avgWordLength: number;
}

/**
 * Calculate text statistics
 * @param text - Input text
 * @returns Text statistics object
 */
function calculateStats(text: string): TextStats {
  const trimmed = text.trim();
  if (!trimmed) {
    return { characters: 0, words: 0, sentences: 0, paragraphs: 0, avgWordLength: 0 };
  }

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim().length > 0);
  const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);

  return {
    characters: text.length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgWordLength: words.length > 0 ? totalWordLength / words.length : 0,
  };
}

/**
 * Enhanced text input component
 * @param props - Component properties
 * @returns Text input element with stats
 */
export function TextInput({
  value,
  onChange,
  placeholder = 'Enter text to analyze...',
  disabled = false,
  maxLength,
  minLength = 0,
  showStats = true,
  autoFocus = false,
  onAnalyze,
}: TextInputProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stats = calculateStats(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) return;
      onChange(newValue);
    },
    [onChange, maxLength]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onAnalyze) {
        e.preventDefault();
        onAnalyze();
      }
    },
    [onAnalyze]
  );

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const isValidLength = value.length >= minLength && (!maxLength || value.length <= maxLength);

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-lg border transition-colors ${
          isFocused
            ? 'border-omega-primary ring-2 ring-omega-primary/20'
            : 'border-omega-border hover:border-omega-muted'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-48 p-4 bg-transparent text-omega-text placeholder-omega-muted resize-none focus:outline-none font-mono text-sm"
          aria-label="Text input for analysis"
        />

        {maxLength && (
          <div className="absolute bottom-2 right-2">
            <span
              className={`text-xs ${
                value.length > maxLength * 0.9
                  ? 'text-omega-warning'
                  : 'text-omega-muted'
              }`}
            >
              {value.length} / {maxLength}
            </span>
          </div>
        )}
      </div>

      {showStats && (
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-4 text-xs text-omega-muted">
            <StatBadge label="Characters" value={stats.characters} />
            <StatBadge label="Words" value={stats.words} />
            <StatBadge label="Sentences" value={stats.sentences} />
            <StatBadge label="Paragraphs" value={stats.paragraphs} />
          </div>
          {onAnalyze && (
            <div className="text-xs text-omega-muted">
              <kbd className="px-1.5 py-0.5 bg-omega-surface border border-omega-border rounded text-[10px]">
                Ctrl
              </kbd>
              <span className="mx-1">+</span>
              <kbd className="px-1.5 py-0.5 bg-omega-surface border border-omega-border rounded text-[10px]">
                Enter
              </kbd>
              <span className="ml-1">to analyze</span>
            </div>
          )}
        </div>
      )}

      {!isValidLength && value.length > 0 && (
        <p className="text-xs text-omega-warning px-2">
          {value.length < minLength
            ? `Minimum ${minLength} characters required`
            : `Maximum ${maxLength} characters exceeded`}
        </p>
      )}
    </div>
  );
}

/**
 * Stat badge component
 */
function StatBadge({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <span>
      <span className="text-omega-text">{value}</span> {label}
    </span>
  );
}

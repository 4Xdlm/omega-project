/**
 * File Drop Zone Component for OMEGA UI
 * @module components/input/FileDropZone
 * @description Drag and drop file input for text files
 */

import { useState, useCallback } from 'react';

/**
 * File drop zone props
 */
interface FileDropZoneProps {
  onFileLoad: (content: string, filename: string) => void;
  accept?: string[];
  disabled?: boolean;
  maxSize?: number;
}

/**
 * File drop zone component
 * @param props - Component properties
 * @returns Drop zone element
 */
export function FileDropZone({
  onFileLoad,
  accept = ['.txt', '.md'],
  disabled = false,
  maxSize = 1024 * 1024,
}: FileDropZoneProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(ext)) {
        setError(`Invalid file type. Accepted: ${accept.join(', ')}`);
        return;
      }

      if (file.size > maxSize) {
        setError(`File too large. Maximum size: ${(maxSize / 1024).toFixed(0)}KB`);
        return;
      }

      try {
        const content = await file.text();
        onFileLoad(content, file.name);
      } catch {
        setError('Failed to read file');
      }
    },
    [accept, maxSize, onFileLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      e.target.value = '';
    },
    [processFile]
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
          isDragging
            ? 'border-omega-primary bg-omega-primary/5'
            : 'border-omega-border hover:border-omega-muted'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept={accept.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="File input"
        />
        <div className="space-y-2">
          <UploadIcon />
          <p className="text-sm text-omega-text">
            {isDragging ? 'Drop file here' : 'Drop a file or click to browse'}
          </p>
          <p className="text-xs text-omega-muted">
            Accepted: {accept.join(', ')} (max {(maxSize / 1024).toFixed(0)}KB)
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-omega-error px-2">{error}</p>
      )}
    </div>
  );
}

/**
 * Upload icon component
 */
function UploadIcon(): JSX.Element {
  return (
    <svg
      className="w-8 h-8 mx-auto text-omega-muted"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

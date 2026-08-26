"use client";

import { useCallback, useId, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

interface ImageDropzoneProps {

  onFileSelect: (file: File) => void;

  accept?: string;
  label?: string;

  previewSlot?: React.ReactNode;

  currentFileName?: string | null;
  onClear?: () => void;
}

export function ImageDropzone({
  onFileSelect,
  accept = "image/*",
  label = "Image",
  previewSlot,
  currentFileName,
  onClear,
}: ImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
        {currentFileName && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
            aria-label="Clear selected file"
          >
            <span className="max-w-[200px] truncate">{currentFileName}</span>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label={`Drop or browse for ${label.toLowerCase()}`}
        className={`flex min-h-[160px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center transition-colors ${
          isDragOver ? "border-accent bg-accent/5" : "border-border-default hover:border-accent/60"
        }`}
      >
        {previewSlot ?? (
          <>
            <UploadCloud className="h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              Drop an image here, or <span className="text-accent">click to browse</span>
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />
    </div>
  );
}

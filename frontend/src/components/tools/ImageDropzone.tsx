"use client";

import { useCallback, useId, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

interface ImageDropzoneProps {
  /** Called with the selected/dropped file. Callers are responsible for
   * validating it's actually an image if `accept` alone isn't a strong
   * enough guarantee (drag-and-drop can bypass `accept`'s filtering). */
  onFileSelect: (file: File) => void;
  /** MIME/extension filter passed to the underlying `<input type="file">` —
   * doesn't restrict drag-and-drop, only the native file picker. */
  accept?: string;
  label?: string;
  /** Optional preview shown once a file's been picked (e.g. an `<img>` or
   * `<canvas>` the caller renders) — the dropzone itself stays stateless
   * about the file's contents, it just hands back the raw `File`. */
  previewSlot?: React.ReactNode;
  /** Shown next to the label when a file is currently loaded, with a
   * clear (×) button — callers pass `null` to hide this row entirely. */
  currentFileName?: string | null;
  onClear?: () => void;
}

/** Shared drag-and-drop / click-to-browse image input used across Module 7
 * (image/graphics) tools — extracted here instead of duplicated per tool
 * since every image tool needs the same upload UX (DEVELOPMENT_GUIDE.md
 * §"Compose, don't rebuild" / CLAUDE.md rule 4). Purely a file-picker: it
 * doesn't read, decode, or preview the file itself — that's each tool's
 * `transform.ts`/ToolView concern, since what counts as "valid" and how to
 * preview it differs per tool (raster image vs. SVG markup vs. QR code). */
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

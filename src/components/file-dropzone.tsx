"use client";

import { useRef, useState } from "react";
import { File as FileIcon, UploadCloud, X } from "lucide-react";

type FileDropzoneProps = {
  accept: string;
  hint: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  accept,
  hint,
  file,
  onFileSelect,
  disabled,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileSelect(dropped);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <FileIcon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {file.name}
          </p>
          <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          disabled={disabled}
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground disabled:opacity-60"
          aria-label="Remove selected file"
        >
          <X size={16} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") &&
        (e.preventDefault(), openPicker())
      }
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        isDragging
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50 hover:bg-background",
      ].join(" ")}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <UploadCloud size={20} />
      </span>
      <p className="text-sm font-medium text-foreground">
        Drag &amp; drop your file here, or{" "}
        <span className="text-accent underline underline-offset-2">
          browse to choose
        </span>
      </p>
      <p className="text-xs text-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

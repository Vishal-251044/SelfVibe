"use client";

/**
 * Drag-and-drop file picker (also a normal button for phones and keyboards).
 * Shows the chosen file name, or an optional preview slot.
 */
import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.hint - e.g. "MP3, WAV or FLAC · up to 50 MB"
 * @param {string} props.accept - <input accept>
 * @param {boolean} [props.multiple=false]
 * @param {(files: File[]) => void} props.onFiles
 * @param {React.ComponentType} [props.icon=UploadCloud]
 * @param {React.ReactNode} [props.children] - Replaces the default prompt (e.g. file summary)
 * @param {string} [props.error]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className]
 */
export default function FileDropzone({
  label,
  hint,
  accept,
  multiple = false,
  onFiles,
  icon: Icon = UploadCloud,
  children,
  error,
  disabled = false,
  className,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const pickFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div className={className}>
      <label htmlFor={inputId} className="text-sm text-fg-muted">
        {label}
      </label>
      <motion.button
        type="button"
        whileTap={disabled ? undefined : tapPress}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) pickFiles(event.dataTransfer.files);
        }}
        className={cn(
          "mt-1.5 flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed px-4 py-6 text-center transition",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isDragging
            ? "border-neon bg-neon-dim shadow-glow-sm"
            : error
              ? "border-danger/70 bg-black"
              : "border-line-strong bg-black hover:border-neon hover:bg-neon-dim"
        )}
      >
        {children ?? (
          <>
            <span className="flex size-12 items-center justify-center rounded-2xl border border-line-strong bg-neon-dim text-neon">
              <Icon size={22} aria-hidden />
            </span>
            <span className="text-sm text-fg">
              <span className="hidden sm:inline">
                Drop {multiple ? "files" : "a file"} here or{" "}
              </span>
              <span className="text-neon underline-offset-4 sm:underline">
                {multiple ? "choose files" : "choose a file"}
              </span>
            </span>
            <span className="text-xs text-fg-subtle">{hint}</span>
          </>
        )}
      </motion.button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          pickFiles(event.target.files);
          event.target.value = ""; // allow picking the same file again
        }}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

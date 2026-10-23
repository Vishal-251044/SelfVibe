"use client";

/**
 * Audio file field: drop / choose → uploads immediately with a progress bar,
 * then shows the file with "Replace". Errors offer a retry.
 */
import { CheckCircle2, FileAudio, RotateCw } from "lucide-react";
import FileDropzone from "@/components/ui/FileDropzone";
import ProgressBar from "@/components/ui/ProgressBar";
import { AUDIO_UPLOAD } from "@/utils/musicConstants";
import { formatFileSize } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {ReturnType<import("@/hooks/useMediaUpload").useMediaUpload>} props.upload
 * @param {string} [props.label="Audio file"]
 * @param {string} [props.error] - Form-level error for this field
 * @param {boolean} [props.disabled=false]
 */
export default function AudioUploadField({
  upload,
  label = "Audio file",
  error,
  disabled = false,
}) {
  const { file, status, progress } = upload;

  return (
    <FileDropzone
      label={label}
      hint={AUDIO_UPLOAD.label}
      accept={AUDIO_UPLOAD.accept}
      icon={FileAudio}
      onFiles={([picked]) => upload.start(picked)}
      error={upload.error ?? error}
      disabled={disabled || status === "uploading"}
    >
      {file && (
        <div className="flex w-full max-w-md flex-col gap-3 text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-neon-dim text-neon">
              {status === "done" ? (
                <CheckCircle2 size={20} aria-hidden />
              ) : (
                <FileAudio size={20} aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-fg">{file.name}</span>
              <span className="block text-xs text-fg-subtle">
                {formatFileSize(file.size)} · {status === "uploading" && `Uploading ${progress}%`}
                {status === "done" && "Uploaded — tap to replace"}
                {status === "error" && (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <RotateCw size={12} aria-hidden /> Tap to choose again
                  </span>
                )}
              </span>
            </span>
          </div>
          {status === "uploading" && (
            <ProgressBar value={progress} label={`Uploading ${file.name}`} />
          )}
        </div>
      )}
    </FileDropzone>
  );
}

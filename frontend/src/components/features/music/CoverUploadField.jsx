"use client";

/**
 * Cover / photo field: square preview (the current image or the new one),
 * uploads as soon as a file is picked, with progress and a remove action.
 */
import { ImagePlus, X } from "lucide-react";
import FileDropzone from "@/components/ui/FileDropzone";
import ProgressBar from "@/components/ui/ProgressBar";
import CoverArt from "@/components/features/music/CoverArt";
import { IMAGE_UPLOAD } from "@/utils/musicConstants";

/**
 * @param {Object} props
 * @param {ReturnType<import("@/hooks/useMediaUpload").useMediaUpload>} props.upload
 * @param {string|null} [props.currentUrl] - Existing cover when editing
 * @param {string} [props.label="Cover art"]
 * @param {string} [props.hint] - Overrides the default hint
 * @param {boolean} [props.disabled=false]
 */
export default function CoverUploadField({
  upload,
  currentUrl = null,
  label = "Cover art",
  hint,
  disabled = false,
}) {
  const previewUrl = upload.previewUrl ?? currentUrl;

  return (
    <div>
      <FileDropzone
        label={label}
        hint={hint ?? `Square works best · ${IMAGE_UPLOAD.label}`}
        accept={IMAGE_UPLOAD.accept}
        icon={ImagePlus}
        onFiles={([picked]) => upload.start(picked)}
        error={upload.error}
        disabled={disabled || upload.status === "uploading"}
      >
        {previewUrl && (
          <div className="flex w-full items-center gap-4 text-left">
            <CoverArt
              src={previewUrl}
              alt="Cover preview"
              className="size-24 rounded-xl"
              sizes="96px"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{upload.file?.name ?? "Current cover"}</p>
              <p className="text-xs text-fg-subtle">
                {upload.status === "uploading" ? `Uploading ${upload.progress}%` : "Tap to replace"}
              </p>
              {upload.status === "uploading" && (
                <ProgressBar value={upload.progress} label="Uploading cover" className="mt-2" />
              )}
            </div>
          </div>
        )}
      </FileDropzone>
      {upload.file && upload.status !== "uploading" && (
        <button
          type="button"
          onClick={upload.reset}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs text-fg-subtle hover:text-danger"
        >
          <X size={14} aria-hidden /> Remove new image
        </button>
      )}
    </div>
  );
}

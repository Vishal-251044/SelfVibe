"use client";

/**
 * Avatar picker: tap the photo to choose an image, see upload progress,
 * or remove the photo. Uploads go straight to Cloudinary (signed by our API);
 * the resulting URL is handed to the parent form, which saves it.
 */
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getAvatarUploadSignature, uploadToCloudinary } from "@/services/upload.service";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FALLBACK_MAX_BYTES = 5 * 1024 * 1024;

/**
 * @param {Object} props
 * @param {string} props.name - For initials
 * @param {string|null} props.value - Current avatar URL
 * @param {(url: string|null) => void} props.onChange
 * @param {(uploading: boolean) => void} [props.onUploadingChange]
 */
export default function AvatarUploader({ name, value, onChange, onUploadingChange }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = idle, 0–100 while uploading
  const [error, setError] = useState(null);

  const setUploading = (isUploading) => onUploadingChange?.(isUploading);

  /** Validate, sign, upload, then report the new URL. */
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!file) return;

    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG or WebP image.");
      return;
    }

    setProgress(0);
    setUploading(true);
    try {
      const signature = await getAvatarUploadSignature();
      if (file.size > (signature.maxBytes ?? FALLBACK_MAX_BYTES)) {
        throw new Error("That image is over 5 MB. Choose a smaller one.");
      }
      const { secureUrl } = await uploadToCloudinary(file, signature, setProgress);
      onChange(secureUrl);
    } catch (uploadError) {
      setError(
        uploadError?.code === "NOT_CONFIGURED"
          ? "Photo uploads aren't available yet."
          : (uploadError?.message ?? "Upload failed. Try another photo.")
      );
    } finally {
      setProgress(null);
      setUploading(false);
    }
  };

  const isUploading = progress !== null;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-label="Change profile photo"
        className="group relative rounded-full"
      >
        <Avatar name={name} src={value} size="lg" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-neon opacity-100 transition group-hover:opacity-100 sm:opacity-0">
          {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
        </span>
        {isUploading && (
          <svg
            className="absolute -inset-1.5 size-[calc(100%+0.75rem)] -rotate-90"
            viewBox="0 0 36 36"
            aria-hidden
          >
            <motion.circle
              cx="18"
              cy="18"
              r="16.5"
              fill="none"
              stroke="var(--color-neon)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
            />
          </svg>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex min-h-11 items-center px-2 text-neon hover:underline disabled:opacity-50"
        >
          {isUploading ? `Uploading ${progress}%` : value ? "Change photo" : "Add photo"}
        </button>
        {value && !isUploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex min-h-11 items-center gap-1 px-2 text-fg-muted hover:text-danger"
          >
            <Trash2 size={14} aria-hidden />
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-center text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

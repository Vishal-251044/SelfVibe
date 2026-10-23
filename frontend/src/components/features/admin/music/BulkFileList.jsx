"use client";

/**
 * Per-file upload rows for the bulk uploader: name, size, progress, and
 * retry / remove buttons.
 */
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, FileAudio, Loader2, RotateCw, X } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatFileSize } from "@/components/features/music/AudioUploadField";
import { listItem } from "@/utils/animations";

const STATUS_ICONS = {
  waiting: { icon: FileAudio, className: "text-fg-subtle" },
  uploading: { icon: Loader2, className: "animate-spin text-neon" },
  done: { icon: CheckCircle2, className: "text-neon" },
  error: { icon: CircleAlert, className: "text-danger" },
};

/**
 * @param {Object} props
 * @param {Array<Object>} props.items - From useBulkFileUploads
 * @param {(id: number) => void} props.onRetry
 * @param {(id: number) => void} props.onRemove
 * @param {boolean} [props.locked=false] - After the import started
 */
export default function BulkFileList({ items, onRetry, onRemove, locked = false }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const { icon: Icon, className } = STATUS_ICONS[item.status];
          return (
            <motion.li
              key={item.id}
              layout="position"
              variants={listItem}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center gap-3 px-3 py-2.5 sm:px-4"
            >
              <Icon size={18} className={`shrink-0 ${className}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{item.file.name}</p>
                {item.status === "uploading" ? (
                  <ProgressBar
                    value={item.progress}
                    label={`Uploading ${item.file.name}`}
                    className="mt-1.5"
                  />
                ) : (
                  <p
                    className={`text-xs ${item.status === "error" ? "text-danger" : "text-fg-subtle"}`}
                  >
                    {item.status === "error"
                      ? item.error
                      : `${formatFileSize(item.file.size)} · ${item.status === "done" ? "uploaded" : "waiting"}`}
                  </p>
                )}
              </div>
              {item.status === "error" && !item.isInvalid && !locked && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  aria-label={`Retry ${item.file.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-neon-dim hover:text-neon"
                >
                  <RotateCw size={16} />
                </button>
              )}
              {!locked && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  <X size={16} />
                </button>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

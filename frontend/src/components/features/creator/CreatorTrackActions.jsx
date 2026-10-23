"use client";

/**
 * Per-track actions in the creator studio: make live / take down, delete.
 * A compact menu on every screen size; delete asks for confirmation.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, MoreVertical, Trash2 } from "lucide-react";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import { changeMyTrackRelease, deleteMyTrack } from "@/services/track.service";
import { slideDown } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {Object} props.track - Managed track
 */
export default function CreatorTrackActions({ track }) {
  const queryClient = useQueryClient();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["creator", "tracks"] });

  const release = useMutation({
    mutationFn: (action) => changeMyTrackRelease(track.id, action),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => deleteMyTrack(track.id),
    onSuccess: () => {
      setIsConfirming(false);
      refresh();
    },
  });

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => event.key === "Escape" && setIsOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const isProcessing = track.status === "processing";
  const isLive = track.status === "published";
  const itemClass =
    "flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-40";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Actions for ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon"
      >
        <MoreVertical size={18} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            variants={slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-card border border-line-strong bg-black/95 py-1 shadow-panel backdrop-blur-xl"
          >
            <button
              type="button"
              role="menuitem"
              disabled={isProcessing || release.isPending}
              onClick={() => {
                setIsOpen(false);
                release.mutate(isLive ? "unpublish" : "publish");
              }}
              className={itemClass}
            >
              {isLive ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {isLive ? "Take down" : "Make live"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                remove.reset();
                setIsConfirming(true);
              }}
              className={`${itemClass} hover:text-danger`}
            >
              <Trash2 size={16} aria-hidden /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {release.isError && (
        <p role="alert" className="absolute right-0 mt-1 w-48 text-right text-xs text-danger">
          {release.error?.message}
        </p>
      )}
      <ConfirmSheet
        open={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        title={`Delete "${track.title}"?`}
        description="The track and its audio files are removed for good. Listeners lose it from their playlists."
      />
    </div>
  );
}

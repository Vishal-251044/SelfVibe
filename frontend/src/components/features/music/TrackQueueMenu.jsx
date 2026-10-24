"use client";

/**
 * "More" menu on a track row: Play next, Add to queue (PRD PLY-3), Add to
 * playlist (LIB-2), Comments (CMT-1), Go to artist. Closes on outside tap / Escape; shows a short confirmation.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ListEnd,
  ListPlus,
  ListStart,
  MessageCircle,
  MoreHorizontal,
  UserRound,
} from "lucide-react";
import { useLibrarySheetsStore } from "@/store/librarySheetsStore";
import { usePlayerStore } from "@/store/playerStore";
import { slideDown } from "@/utils/animations";

const CONFIRM_MS = 1600;

/**
 * @param {Object} props
 * @param {Object} props.track
 * @param {boolean} [props.showArtistLink=true]
 */
export default function TrackQueueMenu({ track, showArtistLink = true }) {
  const playNext = usePlayerStore((state) => state.playNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const openPlaylistPicker = useLibrarySheetsStore((state) => state.openPlaylistPicker);
  const openComments = useLibrarySheetsStore((state) => state.openComments);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
    if (!confirmation) return undefined;
    const timer = setTimeout(() => setConfirmation(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmation]);

  const run = (action, message) => {
    action(track);
    setIsOpen(false);
    setConfirmation(message);
  };

  const itemClass =
    "flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-fg-muted transition hover:bg-neon-dim hover:text-neon";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        aria-label={`More options for ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon"
      >
        {confirmation ? <Check size={18} className="text-neon" /> : <MoreHorizontal size={18} />}
      </button>
      <span role="status" className="sr-only">
        {confirmation}
      </span>
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
              onClick={() => run(playNext, "Playing next")}
              className={itemClass}
            >
              <ListStart size={16} aria-hidden /> Play next
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => run(addToQueue, "Added to queue")}
              className={itemClass}
            >
              <ListEnd size={16} aria-hidden /> Add to queue
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                openPlaylistPicker(track);
              }}
              className={itemClass}
            >
              <ListPlus size={16} aria-hidden /> Add to playlist
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                openComments(track);
              }}
              className={itemClass}
            >
              <MessageCircle size={16} aria-hidden /> Comments
            </button>
            {showArtistLink && track.artist && (
              <Link
                role="menuitem"
                href={`/artist/${track.artist.slug ?? track.artist.id}`}
                onClick={() => setIsOpen(false)}
                className={itemClass}
              >
                <UserRound size={16} aria-hidden /> Go to artist
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

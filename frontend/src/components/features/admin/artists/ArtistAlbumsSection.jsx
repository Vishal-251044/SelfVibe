"use client";

/**
 * Albums on the admin artist page: create, edit, delete, and open one to
 * set its tracks and order.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Disc3, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import CoverArt from "@/components/features/music/CoverArt";
import AlbumFormSheet from "@/components/features/admin/artists/AlbumFormSheet";
import AlbumTracksEditor from "@/components/features/admin/artists/AlbumTracksEditor";
import { deleteAdminAlbum } from "@/services/adminMusic.service";
import { slideDown } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {string} props.artistId
 * @param {Object[]} props.albums
 * @param {() => void} props.onChanged - Refetch the artist after a change
 */
export default function ArtistAlbumsSection({ artistId, albums, onChanged }) {
  const [sheetAlbum, setSheetAlbum] = useState(undefined); // undefined = closed, null = new
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [deletingAlbum, setDeletingAlbum] = useState(null);

  const remove = useMutation({
    mutationFn: (album) => deleteAdminAlbum(album.id),
    onSuccess: () => {
      setDeletingAlbum(null);
      onChanged();
    },
  });

  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle transition";

  return (
    <section className="mt-8" aria-labelledby="albums-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="albums-heading" className="font-display text-xl font-bold">
          Albums
        </h2>
        <Button variant="outline" onClick={() => setSheetAlbum(null)}>
          <Plus size={16} aria-hidden /> New album
        </Button>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="no albums yet"
          description="Group this artist's tracks into albums, EPs or singles."
        />
      ) : (
        <ul className="space-y-3">
          {albums.map((album) => {
            const isOpen = openAlbumId === album.id;
            return (
              <li
                key={album.id}
                className="overflow-hidden rounded-card border border-line bg-surface"
              >
                <div className="flex items-center gap-2 p-3 sm:gap-3">
                  <CoverArt
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    className="size-14 rounded-lg"
                    sizes="56px"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenAlbumId(isOpen ? null : album.id)}
                    aria-expanded={isOpen}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{album.title}</span>
                      <span className="text-xs text-fg-subtle uppercase">
                        {album.type} · {album.trackCount}{" "}
                        {album.trackCount === 1 ? "track" : "tracks"}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`shrink-0 text-fg-subtle transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${album.title}`}
                    onClick={() => setSheetAlbum(album)}
                    className={`${iconButton} hover:bg-neon-dim hover:text-neon`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${album.title}`}
                    onClick={() => {
                      remove.reset();
                      setDeletingAlbum(album);
                    }}
                    className={`${iconButton} hover:bg-danger/10 hover:text-danger`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      variants={slideDown}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="border-t border-line p-3"
                    >
                      <AlbumTracksEditor album={album} artistId={artistId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      {sheetAlbum !== undefined && (
        <AlbumFormSheet
          open
          artistId={artistId}
          album={sheetAlbum}
          onClose={() => setSheetAlbum(undefined)}
          onSaved={() => {
            setSheetAlbum(undefined);
            onChanged();
          }}
        />
      )}
      <ConfirmSheet
        open={Boolean(deletingAlbum)}
        onClose={() => setDeletingAlbum(null)}
        onConfirm={() => remove.mutate(deletingAlbum)}
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        title={deletingAlbum ? `Delete "${deletingAlbum.title}"?` : "Delete album?"}
        description="The album is removed; its tracks stay in the catalog."
      />
    </section>
  );
}

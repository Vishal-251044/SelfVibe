"use client";

/**
 * Admin Console → one artist (/admin/artists/[id]): profile with edit,
 * albums (see ArtistAlbumsSection) and delete.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Disc3, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import ArtistFormSheet from "@/components/features/admin/artists/ArtistFormSheet";
import ArtistAlbumsSection from "@/components/features/admin/artists/ArtistAlbumsSection";
import { deleteAdminArtist, getAdminArtist } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {string} props.artistId
 */
export default function AdminArtistDetail({ artistId }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminArtist(artistId),
    queryFn: ({ signal }) => getAdminArtist(artistId, { signal }),
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminArtist(artistId) });
    queryClient.invalidateQueries({ queryKey: ["admin", "artists"] });
  };

  const remove = useMutation({
    mutationFn: () => deleteAdminArtist(artistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "artists"] });
      router.replace("/admin/artists");
    },
  });

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading artist">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={Disc3}
        command={`selfvibe artists --open ${artistId}`}
        title={error?.status === 404 ? "artist not found" : "couldn't load this artist"}
        description={error?.message}
        action={
          error?.status === 404 ? (
            <Button href="/admin/artists">Back to artists</Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { artist, albums } = data;

  return (
    <>
      <Button href="/admin/artists" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Artists
      </Button>

      <FadeIn className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={artist.stageName} src={artist.avatar} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] font-bold break-words">
              {artist.stageName}
            </h1>
            {artist.verified && (
              <BadgeCheck size={20} className="text-neon" aria-label="Verified" />
            )}
            <Badge tone={artist.isOfficial ? "muted" : "info"}>
              {artist.isOfficial ? "Official" : "Creator"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {artist.genres.join(" · ") || "No genres"}
            {artist.country ? ` · ${artist.country}` : ""}
          </p>
          {artist.bio && <p className="mt-2 line-clamp-2 text-sm text-fg-subtle">{artist.bio}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil size={16} aria-hidden /> Edit
          </Button>
          <Button href={`/artist/${artist.slug ?? artist.id}`} variant="ghost" target="_blank">
            Public page <ExternalLink size={14} aria-hidden />
          </Button>
        </div>
      </FadeIn>

      <ArtistAlbumsSection artistId={artist.id} albums={albums} onChanged={refresh} />

      <div className="mt-10 flex justify-end">
        <Button
          variant="ghost"
          onClick={() => {
            remove.reset();
            setIsConfirmingDelete(true);
          }}
          className="text-danger hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={16} aria-hidden /> Delete artist
        </Button>
      </div>

      {isEditing && (
        <ArtistFormSheet
          open={isEditing}
          artist={artist}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            refresh();
          }}
        />
      )}
      <ConfirmSheet
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        title={`Delete "${artist.stageName}"?`}
        description="Only artists without tracks can be deleted. This can't be undone."
      />
    </>
  );
}

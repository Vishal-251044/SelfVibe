"use client";

/**
 * /creator/upload: upload a song (any signed-in user — PRD CRT-1). Before the
 * first upload the form also asks for the artist name the songs appear under.
 */
import { ArrowLeft, UploadCloud } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import TrackUploadForm from "@/components/features/creator/TrackUploadForm";
import { CreatorSkeleton, useMyArtist } from "@/components/features/creator/CreatorHome";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function CreatorUploadPage() {
  const { data, isPending } = useMyArtist();
  const { isFeatureOn } = useAppSettings();
  if (isPending) return <CreatorSkeleton />;
  if (!isFeatureOn("uploads")) {
    return (
      <EmptyState
        icon={UploadCloud}
        title="uploads are paused"
        description="New uploads are switched off for a little while. Your songs are safe — please try again later."
        action={<Button href="/creator">Back to Studio</Button>}
      />
    );
  }
  const artist = data?.artist ?? null;

  return (
    <>
      <Button href="/creator" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Studio
      </Button>
      <PageHeader
        eyebrow="For artists"
        title="Upload a song"
        subtitle={
          artist
            ? `Publishing as ${artist.stageName}. Files upload while you fill in the details.`
            : "Your first upload creates your artist page. Files upload while you fill in the details."
        }
      />
      <TrackUploadForm artist={artist} />
    </>
  );
}

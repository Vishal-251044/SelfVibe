"use client";

/**
 * /creator/upload: upload a song (any signed-in user — PRD CRT-1). Before the
 * first upload the form also asks for the artist name the songs appear under.
 */
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import TrackUploadForm from "@/components/features/creator/TrackUploadForm";
import { CreatorSkeleton, useMyArtist } from "@/components/features/creator/CreatorHome";

export default function CreatorUploadPage() {
  const { data, isPending } = useMyArtist();
  if (isPending) return <CreatorSkeleton />;
  const artist = data?.artist ?? null;

  return (
    <>
      <Button href="/creator" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Studio
      </Button>
      <PageHeader
        eyebrow="selfvibe upload --track"
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

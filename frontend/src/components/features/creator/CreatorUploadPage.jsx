"use client";

/**
 * /creator/upload: the upload form for creators; listeners are sent to the
 * "Become a Creator" step first.
 */
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import TrackUploadForm from "@/components/features/creator/TrackUploadForm";
import { CreatorSkeleton, useMyArtist } from "@/components/features/creator/CreatorHome";
import BecomeCreatorForm from "@/components/features/creator/BecomeCreatorForm";
import { useAuthStore } from "@/store/authStore";

export default function CreatorUploadPage() {
  const isCreator = useAuthStore((state) => state.user?.roles?.includes("creator"));
  const { data, isPending } = useMyArtist();

  if (isPending) return <CreatorSkeleton />;
  if (!data?.artist || !isCreator) return <BecomeCreatorForm />;

  return (
    <>
      <Button href="/creator" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Studio
      </Button>
      <PageHeader
        eyebrow="selfvibe upload --track"
        title="Upload a track"
        subtitle={`Publishing as ${data.artist.stageName}. Files upload while you fill in the details.`}
      />
      <TrackUploadForm />
    </>
  );
}

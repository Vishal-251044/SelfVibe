"use client";

/**
 * Follow / Following button for an artist (PRD LIB-4). Guests are sent to log in.
 */
import { Check, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import { useArtistFollow } from "@/hooks/useLibrary";

/**
 * @param {Object} props
 * @param {{ id: string, stageName: string }} props.artist
 */
export default function FollowButton({ artist }) {
  const { isFollowing, toggle, isPending } = useArtistFollow(artist.id);

  return (
    <Button
      variant={isFollowing ? "outline" : "primary"}
      size="lg"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? `Unfollow ${artist.stageName}` : `Follow ${artist.stageName}`}
    >
      {isFollowing ? <Check size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

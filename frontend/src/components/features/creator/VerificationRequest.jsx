"use client";

/**
 * The verified badge on the creator's artist card (roadmap Day 9): shows
 * "Verified", "Request under review", or a button to ask for it with a note.
 * Staff review requests in Console → Users & Creators.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock3 } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Sheet from "@/components/ui/Sheet";
import TextAreaField from "@/components/ui/TextAreaField";
import { requestVerification } from "@/services/creator.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {{ verified: boolean, verificationStatus?: string }} props.artist
 */
export default function VerificationRequest({ artist }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: () => requestVerification(note.trim()),
    onSuccess: () => {
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myArtist });
    },
  });

  if (artist.verified) {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-neon">
        <BadgeCheck size={16} aria-hidden /> Verified artist
      </p>
    );
  }
  if (artist.verificationStatus === "pending") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-warning">
        <Clock3 size={16} aria-hidden /> Verification under review
      </p>
    );
  }

  return (
    <>
      <Button variant="ghost" className="-ml-3 px-3" onClick={() => setIsOpen(true)}>
        <BadgeCheck size={16} aria-hidden />
        {artist.verificationStatus === "rejected" ? "Ask for verification again" : "Get verified"}
      </Button>
      <Sheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Ask for the verified badge"
        description="Our team checks that this profile really belongs to you. Tell us anything that helps (links to your socials, other platforms)."
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => send.mutate()} loading={send.isPending}>
              Send request
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormAlert message={send.error?.message ?? null} />
          <TextAreaField
            label="Note for our team (optional)"
            value={note}
            maxLength={500}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </Sheet>
    </>
  );
}

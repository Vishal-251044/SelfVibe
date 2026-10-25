"use client";

/**
 * App-wide voice pieces, mounted once in the app shell (roadmap Day 7):
 * the terminal toasts and the "which one did you mean?" sheet (PRD VOC-4)
 * that also shows "No match for '…'" with suggestions (VOC-8).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import TerminalToaster from "@/components/ui/TerminalToaster";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import VoiceResultItem from "@/components/features/voice/VoiceResultItem";
import { useVoiceStore } from "@/store/voiceStore";
import { showToast } from "@/store/toastStore";
import { cancelListening, setVoiceQueryClient } from "@/lib/voice/voiceSession";
import { playCandidate } from "@/lib/voice/voiceActions";
import { speak } from "@/lib/voice/speechRecognition";
import { getCatalogFilter } from "@/hooks/useCatalogFilter";
import { VOICE_TOAST_MS } from "@/utils/musicConstants";

export default function VoiceLayer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const picker = useVoiceStore((state) => state.picker);
  const setPicker = useVoiceStore((state) => state.setPicker);
  const [busyIndex, setBusyIndex] = useState(-1);

  useEffect(() => {
    setVoiceQueryClient(queryClient);
    return () => cancelListening(); // never leave the mic open
  }, [queryClient]);

  const close = () => setPicker(null);

  /** Play the chosen candidate and confirm in the toast. */
  const choose = async (candidate, index) => {
    const { language, speakReplies } = useVoiceStore.getState();
    setBusyIndex(index);
    try {
      const result = await playCandidate(candidate, { language, catalog: getCatalogFilter() });
      showToast({
        id: "voice",
        command: `selfvibe voice --pick ${index + 1}`,
        message: result.message,
        tone: result.tone,
        durationMs: VOICE_TOAST_MS,
      });
      if (speakReplies) speak(result.message, language);
      close();
    } catch (error) {
      showToast({
        id: "voice",
        command: "selfvibe voice --pick",
        message: error?.message ?? "couldn't play that",
        tone: "error",
      });
    } finally {
      setBusyIndex(-1);
    }
  };

  const searchInstead = () => {
    const query = picker?.query ?? "";
    close();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <TerminalToaster />
      <Sheet
        open={Boolean(picker)}
        onClose={close}
        title={picker?.notFound ? `No match for '${picker?.query}'` : "Which one did you mean?"}
        description={
          picker?.notFound
            ? picker.candidates.length
              ? "Nothing matched. Try one of these trending songs, or search instead."
              : "Nothing matched. Try saying the song and the artist, or search instead."
            : `For "${picker?.query ?? ""}"`
        }
        footer={
          <Button variant="outline" fullWidth onClick={searchInstead}>
            <Search size={16} aria-hidden /> Search &ldquo;{picker?.query}&rdquo;
          </Button>
        }
      >
        {picker && picker.candidates.length > 0 && (
          <Stagger className="space-y-1" stagger={0.05} inView={false}>
            {picker.candidates.map((candidate, index) => (
              <StaggerItem key={`${candidate.type}-${candidate.item.id ?? candidate.item.slug}`}>
                <VoiceResultItem
                  candidate={candidate}
                  isBusy={busyIndex !== -1}
                  onSelect={() => choose(candidate, index)}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Sheet>
    </>
  );
}

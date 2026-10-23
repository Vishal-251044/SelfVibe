"use client";

/**
 * Taste quiz (PRD ONB-1, ONB-2): genres (3+) → vibes (2+) → artists (optional).
 * Saves the answers as the user's starting taste profile, then continues to
 * ?next= or /home. Can be skipped. Opening it again later ("retake") starts
 * from the user's current taste.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ListMusic, RotateCw, TriangleAlert } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import SelectableTile from "@/components/features/onboarding/SelectableTile";
import ArtistPicker from "@/components/features/onboarding/ArtistPicker";
import { useAuthStore } from "@/store/authStore";
import { getArtistSuggestions, getOnboardingOptions } from "@/services/onboarding.service";
import * as userService from "@/services/user.service";
import { ONBOARDING_LIMITS, QUERY_KEYS } from "@/utils/constants";
import { cn, getSafeRedirect } from "@/utils/genericFunctions";
import { EASE_OUT, DURATION } from "@/utils/animations";

const STEPS = [
  {
    key: "genres",
    command: "selfvibe taste --genres",
    title: "What do you listen to?",
    hint: `Pick at least ${ONBOARDING_LIMITS.minGenres} genres.`,
    min: ONBOARDING_LIMITS.minGenres,
    max: ONBOARDING_LIMITS.maxGenres,
  },
  {
    key: "vibes",
    command: "selfvibe taste --vibes",
    title: "When do you press play?",
    hint: `Pick at least ${ONBOARDING_LIMITS.minVibes} vibes.`,
    min: ONBOARDING_LIMITS.minVibes,
    max: ONBOARDING_LIMITS.maxVibes,
  },
  {
    key: "artists",
    command: "selfvibe taste --artists",
    title: "Any artists you love?",
    hint: "Picked for your genres and vibes. Optional — choose a few, or finish now.",
    min: 0,
    max: ONBOARDING_LIMITS.maxArtists,
  },
];

export default function TasteQuiz() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const isRetake = Boolean(user?.onboardingDone);
  const destination = getSafeRedirect(searchParams.get("next"), isRetake ? "/profile" : "/home");

  const [stepIndex, setStepIndex] = useState(0);
  // null = untouched, so a retake can start from the saved taste without an effect
  const [picked, setPicked] = useState({ genres: null, vibes: null, artists: null });
  const [limitHint, setLimitHint] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const optionsQuery = useQuery({
    queryKey: QUERY_KEYS.onboardingOptions,
    queryFn: ({ signal }) => getOnboardingOptions({ signal }),
  });
  const tasteQuery = useQuery({
    queryKey: QUERY_KEYS.taste,
    queryFn: ({ signal }) => userService.getTaste({ signal }),
    enabled: isRetake,
  });

  /** Current selection for a step: the user's picks, else their saved taste, else empty. */
  const selectionFor = (key) => {
    if (picked[key]) return picked[key];
    const saved = tasteQuery.data?.taste?.[key] ?? [];
    return new Set(saved.map((item) => (key === "artists" ? item.id : item.slug)));
  };

  const step = STEPS[stepIndex];
  const pickedGenres = [...selectionFor("genres")];
  const pickedVibes = [...selectionFor("vibes")];

  // Step 3 suggests artists that match steps 1–2 (refetched if the picks change)
  const artistsQuery = useQuery({
    queryKey: QUERY_KEYS.artistSuggestions(pickedGenres, pickedVibes),
    queryFn: ({ signal }) =>
      getArtistSuggestions({ genres: pickedGenres, vibes: pickedVibes }, { signal }),
    enabled: step.key === "artists",
  });
  const selected = selectionFor(step.key);
  const isLastStep = stepIndex === STEPS.length - 1;
  const canContinue = selected.size >= step.min;

  /** Select / unselect one option, respecting the step's maximum. */
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size >= step.max) {
      setLimitHint(`You can pick up to ${step.max}.`);
      return;
    } else {
      next.add(id);
    }
    setLimitHint(null);
    setPicked((current) => ({ ...current, [step.key]: next }));
  };

  const goTo = (index) => {
    setLimitHint(null);
    setSaveError(null);
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Save the quiz (or skip it) and move on. */
  const finish = async ({ skip = false } = {}) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const { user: updatedUser } = skip
        ? await userService.skipOnboarding()
        : await userService.completeOnboarding({
            genres: [...selectionFor("genres")],
            vibes: [...selectionFor("vibes")],
            artists: [...selectionFor("artists")],
          });
      setUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taste });
      router.replace(destination);
    } catch (error) {
      setSaveError(error?.message ?? "Couldn't save your picks. Try again.");
      setIsSaving(false);
    }
  };

  const options = optionsQuery.data;
  const isLoading = optionsQuery.isPending || (isRetake && tasteQuery.isPending);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header: logo, progress, skip */}
      <header className="pt-safe px-safe sticky top-0 z-30 border-b border-line bg-black/85 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4">
          <Logo href={null} size="sm" />
          <Button
            variant="ghost"
            onClick={() => (isRetake ? router.replace(destination) : finish({ skip: true }))}
            disabled={isSaving}
          >
            {isRetake ? "Cancel" : "Skip for now"}
          </Button>
        </div>
        <div
          className="mx-auto flex max-w-5xl gap-2 pb-3"
          aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}
        >
          {STEPS.map((item, index) => (
            <span key={item.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full origin-left rounded-full bg-neon shadow-glow-sm"
                initial={false}
                animate={{ scaleX: index <= stepIndex ? 1 : 0 }}
                transition={{ duration: DURATION.slow, ease: EASE_OUT }}
              />
            </span>
          ))}
        </div>
      </header>

      <main className="px-safe mx-auto w-full max-w-5xl flex-1 pt-8 pb-40 md:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <p className="text-sm text-neon">
              $ {step.command}{" "}
              <span className="text-fg-subtle">
                · step {stepIndex + 1}/{STEPS.length}
              </span>
            </p>
            <h1 className="mt-3 font-display text-[clamp(1.75rem,6vw,2.75rem)] leading-tight font-bold">
              {isRetake && stepIndex === 0 ? "Update your taste" : step.title}
            </h1>
            <p className="mt-2 text-sm text-fg-muted sm:text-base">{step.hint}</p>

            <div className="mt-8">
              {isLoading && <QuizSkeleton />}

              {optionsQuery.isError && (
                <EmptyState
                  icon={TriangleAlert}
                  command="selfvibe taste --load"
                  title="couldn't load the quiz"
                  description={optionsQuery.error?.message}
                  action={
                    <Button onClick={() => optionsQuery.refetch()}>
                      <RotateCw size={16} aria-hidden />
                      Try again
                    </Button>
                  }
                />
              )}

              {options &&
                !isLoading &&
                step.key !== "artists" &&
                options[step.key].length === 0 && (
                  <EmptyState
                    icon={ListMusic}
                    command={`selfvibe taste --${step.key}`}
                    title={`no ${step.key} available yet`}
                    description="The catalog is still being set up. Skip for now — you can take the quiz later from your profile."
                  />
                )}

              {options && !isLoading && step.key !== "artists" && options[step.key].length > 0 && (
                <Stagger
                  key={step.key}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
                  stagger={0.03}
                  inView={false}
                >
                  {options[step.key].map((option) => (
                    <StaggerItem key={option.slug} className="h-full">
                      <SelectableTile
                        option={option}
                        selected={selected.has(option.slug)}
                        onToggle={() => toggle(option.slug)}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              {options && !isLoading && step.key === "artists" && (
                <ArtistPicker
                  suggestions={artistsQuery.data}
                  isLoading={artistsQuery.isPending}
                  isError={artistsQuery.isError}
                  onRetry={() => artistsQuery.refetch()}
                  selected={selected}
                  onToggle={toggle}
                  genres={options.genres}
                  pickedGenres={pickedGenres}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky action bar */}
      <footer className="pb-safe px-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-black/90 backdrop-blur-xl md:px-6">
        <div className="mx-auto max-w-5xl py-3">
          <FormAlert message={saveError} className="mb-3" />
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => goTo(stepIndex - 1)}
                aria-label="Back"
                disabled={isSaving}
              >
                <ArrowLeft size={18} aria-hidden />
              </Button>
            )}
            <p
              className={cn("flex-1 text-sm", limitHint ? "text-warning" : "text-fg-muted")}
              aria-live="polite"
            >
              {limitHint ??
                (step.min > 0
                  ? `${Math.min(selected.size, step.min)} of ${step.min} picked`
                  : `${selected.size} picked`)}
              {canContinue && step.min > 0 && !limitHint && (
                <Check size={16} className="ml-1 inline text-neon" aria-hidden />
              )}
            </p>
            {isLastStep ? (
              <Button onClick={() => finish()} loading={isSaving} disabled={!options || isSaving}>
                {isSaving ? "Saving…" : "Finish"}
              </Button>
            ) : (
              <Button onClick={() => goTo(stepIndex + 1)} disabled={!canContinue || !options}>
                Continue
                <ArrowRight size={18} aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Skeleton tiles shown while the quiz options load. */
function QuizSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-card" />
      ))}
    </div>
  );
}

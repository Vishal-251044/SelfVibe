/**
 * Taste quiz (/onboarding). Reads ?next= with useSearchParams, so it renders inside Suspense.
 */
import { Suspense } from "react";
import TasteQuiz from "@/components/features/onboarding/TasteQuiz";
import ScreenLoader from "@/components/ui/ScreenLoader";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <TasteQuiz />
    </Suspense>
  );
}

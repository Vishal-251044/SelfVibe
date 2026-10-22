/**
 * Listener sign-up page (/signup).
 * AuthForm reads ?next= with useSearchParams, so it renders inside Suspense.
 */
import { Suspense } from "react";
import AuthForm from "@/components/features/auth/AuthForm";
import ScreenLoader from "@/components/ui/ScreenLoader";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<ScreenLoader className="min-h-80" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}

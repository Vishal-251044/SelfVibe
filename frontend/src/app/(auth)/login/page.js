/**
 * Listener login page (/login).
 * AuthForm reads ?next= with useSearchParams, so it renders inside Suspense.
 */
import { Suspense } from "react";
import AuthForm from "@/components/features/auth/AuthForm";
import ScreenLoader from "@/components/ui/ScreenLoader";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<ScreenLoader className="min-h-80" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}

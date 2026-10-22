/**
 * Reset password (/reset-password?token=…): opened from the emailed link.
 * The form reads the token with useSearchParams, so it renders inside Suspense.
 */
import { Suspense } from "react";
import ResetPasswordForm from "@/components/features/auth/ResetPasswordForm";
import ScreenLoader from "@/components/ui/ScreenLoader";

export const metadata = {
  title: "Reset password",
  // The token is in the URL: never send it to other sites
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ScreenLoader className="min-h-80" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

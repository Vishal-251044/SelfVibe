/**
 * Forgot password (/forgot-password): request a reset link by email.
 */
import ForgotPasswordForm from "@/components/features/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

/**
 * Listener sign-up page (/signup).
 */
import AuthForm from "@/components/features/auth/AuthForm";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}

/**
 * Listener login page (/login).
 */
import AuthForm from "@/components/features/auth/AuthForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}

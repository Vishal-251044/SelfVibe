"use client";

/**
 * Shared login / signup form: fields, client-side validation, submit to the
 * API through the auth store, server error display, Google button and the
 * switch link to the other mode. After success it returns the user to
 * ?next=… (internal paths only) or /home.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import GoogleButton from "@/components/features/auth/GoogleButton";
import { useAuthStore } from "@/store/authStore";
import { validateAuthForm } from "@/utils/validators";
import { getSafeRedirect } from "@/utils/genericFunctions";

const COPY = {
  login: {
    command: "selfvibe login",
    title: "Welcome back",
    subtitle: "Log in to pick up where you left off.",
    submit: "Log in",
    switchText: "New to SelfVibe?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    command: "selfvibe signup",
    title: "Create your account",
    subtitle: "Free forever. Your feed starts learning from the first play.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login",
  },
};

/**
 * @param {Object} props
 * @param {"login"|"signup"} props.mode
 */
export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const copy = COPY[mode];

  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carry ?next= across the login ↔ signup switch
  const nextParam = searchParams.get("next");
  const switchHref = nextParam
    ? `${copy.switchHref}?next=${encodeURIComponent(nextParam)}`
    : copy.switchHref;

  /** Update one field and clear its error as the user types. */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  /**
   * Validate, call the API, then redirect. Field errors from the API are shown
   * under the matching inputs; anything else in the alert above the form.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateAuthForm(values, { requireName: isSignup });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await register({ name: values.name, email: values.email, password: values.password });
      } else {
        await login({ email: values.email, password: values.password });
      }
      router.replace(getSafeRedirect(nextParam));
    } catch (error) {
      const fieldErrors = error?.details?.fields;
      if (fieldErrors) setErrors(fieldErrors);
      setFormError(fieldErrors ? null : (error?.message ?? "Something went wrong. Try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-neon">$ {copy.command}</p>
      <h1 className="mt-3 font-display text-3xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-sm text-fg-muted">{copy.subtitle}</p>

      <FormAlert message={formError} className="mt-6" />

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {isSignup && (
          <TextField
            label="Name"
            name="name"
            icon={User}
            placeholder="Your name"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            error={errors.name}
          />
        )}
        <TextField
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        <Button type="submit" fullWidth size="lg" className="mt-2" loading={isSubmitting}>
          {isSubmitting ? "Please wait…" : copy.submit}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-fg-subtle">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton />

      <p className="mt-8 text-center text-sm text-fg-muted">
        {copy.switchText}{" "}
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center font-semibold text-neon hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}

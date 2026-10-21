"use client";

/**
 * Shared login / signup form: fields, client-side validation, Google button
 * and the switch link to the other mode.
 */
import { useState } from "react";
import Link from "next/link";
import { Lock, Mail, User } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/features/auth/GoogleButton";
import { validateAuthForm } from "@/utils/validators";

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

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  /** Update one field and clear its error as the user types. */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateAuthForm(values, { requireName: isSignup });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // TODO(Day 2): call auth.service (POST /api/auth/login | /api/auth/register)
  };

  return (
    <div>
      <p className="text-sm text-neon">$ {copy.command}</p>
      <h1 className="mt-3 font-display text-3xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-sm text-fg-muted">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
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

        <Button type="submit" fullWidth size="lg" className="mt-2">
          {copy.submit}
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
        <Link href={copy.switchHref} className="font-semibold text-neon hover:underline">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}

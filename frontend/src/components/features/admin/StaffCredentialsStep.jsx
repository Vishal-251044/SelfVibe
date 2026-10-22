"use client";

/**
 * Console sign-in, step 1: staff email + password.
 */
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import * as adminAuthService from "@/services/adminAuth.service";
import { validateAuthForm } from "@/utils/validators";

/**
 * @param {Object} props
 * @param {(result: { step: "setup"|"verify", challengeToken: string }) => void} props.onSuccess
 * @param {string|null} [props.notice] - Info message, e.g. after an idle sign-out
 */
export default function StaffCredentialsStep({ onSuccess, notice }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const validationErrors = validateAuthForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      onSuccess(await adminAuthService.startLogin(values));
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      else setFormError(error?.message ?? "Sign-in failed. Try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-neon">$ selfvibe console --login</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Console sign-in</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Staff only. Two-factor authentication is required.
      </p>

      <FormAlert message={notice} tone="info" className="mt-6" />
      <FormAlert message={formError} className="mt-6" />

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="username"
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
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
          {isSubmitting ? "Checking…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}

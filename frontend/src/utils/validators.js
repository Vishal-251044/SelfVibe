/**
 * Client-side form validators. The backend re-validates everything (Zod, Day 2);
 * these only give users fast feedback.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8; // PRD AUTH-1

/**
 * Validate login / signup fields.
 * @param {Object} values - { name?, email, password }
 * @param {Object} [options]
 * @param {boolean} [options.requireName=false] - Validate the name field (signup)
 * @returns {Object} Map of field name → error message; empty when valid
 */
export function validateAuthForm(values, { requireName = false } = {}) {
  const errors = {};

  if (requireName && !values.name?.trim()) {
    errors.name = "Enter your name";
  }

  if (!values.email?.trim()) {
    errors.email = "Enter your email";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Enter your password";
  } else if (requireName && values.password.length < PASSWORD_MIN_LENGTH) {
    // Length rule only applies when creating a password, not when logging in
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  return errors;
}

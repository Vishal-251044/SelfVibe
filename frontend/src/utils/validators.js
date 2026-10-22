/**
 * Client-side form validators. The backend re-validates everything with Zod;
 * these only give users fast feedback. Rules mirror backend/src/validators.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8; // PRD AUTH-1
const PASSWORD_MAX_BYTES = 72; // bcrypt limit
const NAME_MAX_LENGTH = 80;
const TOTP_PATTERN = /^\d{6}$/;
const BACKUP_CODE_PATTERN = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

/**
 * Validate login / signup fields.
 * @param {Object} values - { name?, email, password }
 * @param {Object} [options]
 * @param {boolean} [options.requireName=false] - Signup mode: validate name and new-password rules
 * @returns {Object} Map of field name → error message; empty when valid
 */
export function validateAuthForm(values, { requireName = false } = {}) {
  const errors = {};

  if (requireName) {
    const name = values.name?.trim() ?? "";
    if (!name) errors.name = "Enter your name";
    else if (name.length > NAME_MAX_LENGTH) errors.name = "Name must be 80 characters or fewer";
  }

  if (!values.email?.trim()) {
    errors.email = "Enter your email";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Enter your password";
  } else if (requireName) {
    // Length rules only apply when creating a password, not when logging in
    if (values.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters`;
    } else if (new TextEncoder().encode(values.password).length > PASSWORD_MAX_BYTES) {
      errors.password = `Use at most ${PASSWORD_MAX_BYTES} characters`;
    }
  }

  return errors;
}

/**
 * Validate a 2FA code: 6 digits, or a backup code like "ABCD-EFGH".
 * @param {string} code
 * @param {boolean} [allowBackupCode=false]
 * @returns {string|null} Error message, or null when valid
 */
export function validateTwoFactorCode(code, allowBackupCode = false) {
  const value = code.trim();
  if (!value) return "Enter the code";
  if (TOTP_PATTERN.test(value)) return null;
  if (allowBackupCode && BACKUP_CODE_PATTERN.test(value)) return null;
  return allowBackupCode ? "Enter a backup code like ABCD-EFGH" : "Enter the 6-digit code";
}

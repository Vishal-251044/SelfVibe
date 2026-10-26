/**
 * Transactional email templates in the SelfVibe theme (black, neon green,
 * monospace). Inline styles only — email clients ignore <style> blocks.
 */

/**
 * Escape text for safe use inside HTML.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
}

/**
 * Wrap content in the branded email layout.
 * @param {Object} options
 * @param {string} options.title - Heading
 * @param {string} options.bodyHtml - Already-escaped HTML paragraphs
 * @param {{ label: string, url: string }} [options.button]
 * @param {string} [options.footnote]
 * @returns {string} HTML document
 */
function layout({ title, bodyHtml, button, footnote }) {
  const mono = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";
  return `<!doctype html>
<html><body style="margin:0;background:#000;padding:32px 16px;font-family:${mono};color:#e5e7eb">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#050806;border:1px solid rgba(34,197,94,.45);border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#bbf7d0">SelfVibe</p>
        <p style="margin:0 0 8px;font-size:13px;color:#22c55e">$ selfvibe notify</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${escapeHtml(title)}</h1>
        ${bodyHtml}
        ${
          button
            ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px">${escapeHtml(button.label)}</a></p>
        <p style="margin:0 0 8px;font-size:12px;color:#6b7280">Or paste this link into your browser:</p>
        <p style="margin:0;font-size:12px;word-break:break-all"><a href="${escapeHtml(button.url)}" style="color:#22c55e">${escapeHtml(button.url)}</a></p>`
            : ""
        }
        ${footnote ? `<p style="margin:28px 0 0;font-size:12px;color:#6b7280">${escapeHtml(footnote)}</p>` : ""}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/**
 * "Reset your password" email (PRD AUTH-4).
 * @param {{ name: string, resetUrl: string, ttlMinutes: number }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function passwordResetEmail({ name, resetUrl, ttlMinutes }) {
  const greeting = `Hi ${name},`;
  const line = `We got a request to reset your SelfVibe password. The link works for ${ttlMinutes} minutes and can be used once.`;
  const footnote = "Didn't ask for this? You can ignore this email — your password won't change.";

  return {
    subject: "Reset your SelfVibe password",
    html: layout({
      title: "Reset your password",
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(greeting)}</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Choose a new password", url: resetUrl },
      footnote,
    }),
    text: `${greeting}\n\n${line}\n\n${resetUrl}\n\n${footnote}`,
  };
}

/**
 * "Your password was changed" confirmation.
 * @param {{ name: string, loginUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function passwordChangedEmail({ name, loginUrl }) {
  const line =
    "Your SelfVibe password was just changed and you were signed out on all devices. If this wasn't you, reset your password right away.";
  return {
    subject: "Your SelfVibe password was changed",
    html: layout({
      title: "Password changed",
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(name)},</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Log in", url: loginUrl },
    }),
    text: `Hi ${name},\n\n${line}\n\n${loginUrl}`,
  };
}

/**
 * "Storage pool is full" alert for the Owner (PRD STO-4).
 * @param {{ name: string, pool: string, consoleUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function storageFullEmail({ name, pool, consoleUrl }) {
  const line = `Every Cloudinary account in the ${pool} storage pool is full or paused, so new ${pool} uploads are being rejected. Add an account to CLOUDINARY_ACCOUNTS or free up space.`;
  return {
    subject: `SelfVibe: the ${pool} storage pool is full`,
    html: layout({
      title: "Storage pool is full",
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(name)},</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Open the console", url: consoleUrl },
    }),
    text: `Hi ${name},\n\n${line}\n\n${consoleUrl}`,
  };
}

/**
 * "You're invited to the SelfVibe team" email (roadmap Day 9, Team).
 * @param {{ inviterName: string, roleLabel: string, acceptUrl: string, ttlDays: number }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function staffInviteEmail({ inviterName, roleLabel, acceptUrl, ttlDays }) {
  const line = `${inviterName} invited you to help run SelfVibe as ${roleLabel}. Accept the invite to set up your console access — you'll also set up two-factor authentication.`;
  return {
    subject: "You're invited to the SelfVibe team",
    html: layout({
      title: "Join the SelfVibe team",
      bodyHtml: `<p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Accept invite", url: acceptUrl },
      footnote: `This invite expires in ${ttlDays} days. If you weren't expecting it, ignore this email.`,
    }),
    text: `${line}\n\n${acceptUrl}\n\nThis invite expires in ${ttlDays} days.`,
  };
}

/**
 * Moderation warning to an uploader / commenter (roadmap Day 9, Moderation).
 * @param {{ name: string, what: string, reason: string, appUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function moderationWarningEmail({ name, what, reason, appUrl }) {
  const line = `We received a report about ${what} and our team reviewed it (reason: ${reason}). Please make sure what you share follows the SelfVibe community rules. Repeated problems can lead to content being removed or the account being suspended.`;
  return {
    subject: "A note from the SelfVibe team",
    html: layout({
      title: "Please review our community rules",
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(name)},</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Open SelfVibe", url: appUrl },
    }),
    text: `Hi ${name},\n\n${line}\n\n${appUrl}`,
  };
}

/**
 * "New console sign-in" alert to the Owner (PRD ADL-5, roadmap Day 10).
 * @param {{ staffName: string, staffEmail: string, roleLabel: string, device: string, ip: string, at: string, consoleUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function staffNewDeviceEmail({
  staffName,
  staffEmail,
  roleLabel,
  device,
  ip,
  at,
  consoleUrl,
}) {
  const rows = [
    ["Who", `${staffName} (${staffEmail}) · ${roleLabel}`],
    ["Device", device],
    ["IP address", ip],
    ["When", at],
  ];
  const tableHtml = rows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 6px;line-height:1.6"><span style="color:#6b7280">${escapeHtml(label)}:</span> ${escapeHtml(value)}</p>`
    )
    .join("");
  const line =
    "Someone signed in to the SelfVibe console from a device we haven't seen for this account before.";
  return {
    subject: `New console sign-in: ${staffName}`,
    html: layout({
      title: "New device signed in",
      bodyHtml: `<p style="margin:0 0 16px;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>${tableHtml}`,
      button: { label: "Open the Team page", url: consoleUrl },
      footnote:
        'If this wasn\'t expected, open Team and use "Sign out everywhere" and "Reset 2FA" for this person.',
    }),
    text: `${line}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${consoleUrl}`,
  };
}

/**
 * "Console account locked" alert (PRD ADL-5): sent to the Owner and the locked person.
 * @param {{ staffName: string, staffEmail: string, minutes: number, ip: string, consoleUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function staffLockedEmail({ staffName, staffEmail, minutes, ip, consoleUrl }) {
  const line = `The console account of ${staffName} (${staffEmail}) was locked for ${minutes} minutes after too many wrong passwords or codes. The last attempt came from IP ${ip}.`;
  return {
    subject: "SelfVibe console account locked",
    html: layout({
      title: "Account locked",
      bodyHtml: `<p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Open the console", url: consoleUrl },
      footnote:
        "If these attempts weren't you, change the password. The Owner can unlock the account early from the Team page.",
    }),
    text: `${line}\n\n${consoleUrl}`,
  };
}

/**
 * "Welcome to Premium / Creator Pro" (PRD §10.10). Razorpay sends the payment receipt itself.
 * @param {{ name: string, planLabel: string, renewsOn: string|null, manageUrl: string }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function subscriptionStartedEmail({ name, planLabel, renewsOn, manageUrl }) {
  const line = `Your SelfVibe ${planLabel} plan is active. Thanks for supporting SelfVibe and the artists on it.${renewsOn ? ` It renews on ${renewsOn}; you can cancel any time from your profile.` : ""}`;
  return {
    subject: `Welcome to SelfVibe ${planLabel}`,
    html: layout({
      title: `${planLabel} is on`,
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(name)},</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: "Manage your plan", url: manageUrl },
    }),
    text: `Hi ${name},\n\n${line}\n\n${manageUrl}`,
  };
}

/**
 * "We couldn't renew your plan" (Razorpay retries for a few days, then stops).
 * @param {{ name: string, planLabel: string, manageUrl: string, isFinal: boolean }} data
 * @returns {{ subject: string, html: string, text: string }}
 */
export function paymentFailedEmail({ name, planLabel, manageUrl, isFinal }) {
  const line = isFinal
    ? `We couldn't renew your SelfVibe ${planLabel} plan after several tries, so your account is back on the Free plan. You can subscribe again any time.`
    : `We couldn't renew your SelfVibe ${planLabel} plan. We'll try again over the next few days. Please check your UPI app or card so your plan keeps going.`;
  return {
    subject: isFinal
      ? `Your SelfVibe ${planLabel} plan has ended`
      : "Your SelfVibe payment didn't go through",
    html: layout({
      title: isFinal ? "Plan ended" : "Payment didn't go through",
      bodyHtml: `<p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(name)},</p><p style="margin:0;line-height:1.6;color:#9ca3af">${escapeHtml(line)}</p>`,
      button: { label: isFinal ? "See plans" : "Check your plan", url: manageUrl },
    }),
    text: `Hi ${name},\n\n${line}\n\n${manageUrl}`,
  };
}

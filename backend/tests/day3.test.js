/**
 * Unit tests for Day 3 logic: Google ID token checks, Cloudinary signing,
 * avatar URL ownership, quiz → taste weights, validators and email escaping.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createGoogleAuthRequest, parseGoogleIdToken } from "../src/services/googleAuth.service.js";
import {
  createAvatarUploadSignature,
  isOwnAvatarUrl,
  signCloudinaryParams,
} from "../src/services/upload.service.js";
import { buildQuizTasteWeights } from "../src/services/onboarding.service.js";
import { onboardingSchema, updateProfileSchema } from "../src/validators/user.validator.js";
import { resetPasswordSchema } from "../src/validators/auth.validator.js";
import { passwordResetEmail } from "../src/utils/emailTemplates.js";
import { getSafeRedirectPath } from "../src/helpers/genericFunctions.js";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const NOW = 1_800_000_000;

/**
 * Build an unsigned JWT-shaped token with the given claims.
 * @param {Object} claims
 * @returns {string}
 */
function idToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(claims)}.signature`;
}

const validClaims = {
  iss: "https://accounts.google.com",
  aud: CLIENT_ID,
  sub: "1234567890",
  email: "Riya@Example.com",
  email_verified: true,
  name: "Riya Sharma",
  picture: "https://lh3.googleusercontent.com/a/photo",
  exp: NOW + 3600,
};

describe("Google ID token", () => {
  it("returns a normalised profile for a valid token", () => {
    const profile = parseGoogleIdToken(idToken(validClaims), NOW);
    assert.deepEqual(profile, {
      googleId: "1234567890",
      email: "riya@example.com",
      emailVerified: true,
      name: "Riya Sharma",
      picture: "https://lh3.googleusercontent.com/a/photo",
    });
  });

  for (const [label, override] of [
    ["another app's audience", { aud: "someone-else.apps.googleusercontent.com" }],
    ["a non-Google issuer", { iss: "https://evil.example.com" }],
    ["an expired token", { exp: NOW - 3600 }],
    ["a missing subject", { sub: undefined }],
  ]) {
    it(`rejects ${label}`, () => {
      assert.throws(() => parseGoogleIdToken(idToken({ ...validClaims, ...override }), NOW), {
        statusCode: 401,
      });
    });
  }

  it("rejects garbage", () => {
    assert.throws(() => parseGoogleIdToken("not-a-jwt", NOW), { statusCode: 401 });
  });

  it("reports unverified emails (sign-in then refuses them)", () => {
    const profile = parseGoogleIdToken(idToken({ ...validClaims, email_verified: false }), NOW);
    assert.equal(profile.emailVerified, false);
  });

  it("builds a consent URL with state and an S256 PKCE challenge", () => {
    const { url, state, codeVerifier } = createGoogleAuthRequest();
    const params = new URL(url).searchParams;
    assert.equal(params.get("client_id"), CLIENT_ID);
    assert.equal(params.get("redirect_uri"), process.env.GOOGLE_CALLBACK_URL);
    assert.equal(params.get("scope"), "openid email profile");
    assert.equal(params.get("state"), state);
    assert.equal(params.get("code_challenge_method"), "S256");
    assert.equal(
      params.get("code_challenge"),
      createHash("sha256").update(codeVerifier).digest("base64url")
    );
    assert.ok(codeVerifier.length >= 43 && codeVerifier.length <= 128);
  });
});

describe("Cloudinary upload signing", () => {
  it("matches Cloudinary's documented example", () => {
    const signature = signCloudinaryParams(
      {
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        public_id: "sample_image",
        timestamp: 1315060510,
      },
      "abcd"
    );
    assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("signs a per-user avatar upload (fixed public id, overwrite, image formats only)", () => {
    const { uploadUrl, fields } = createAvatarUploadSignature("64b000000000000000000001");
    assert.equal(uploadUrl, "https://api.cloudinary.com/v1_1/selfvibe-test/image/upload");
    assert.equal(fields.public_id, "user_64b000000000000000000001");
    assert.equal(fields.folder, "selfvibe/avatars");
    assert.equal(fields.overwrite, "true");
    assert.equal(fields.allowed_formats, "jpg,jpeg,png,webp");
    assert.equal(fields.api_key, "123456789");
    const { signature, api_key: apiKey, ...signed } = fields;
    assert.ok(apiKey);
    assert.equal(signature, signCloudinaryParams(signed, process.env.CLOUDINARY_API_SECRET));
  });

  it("accepts only this user's avatar in our cloud", () => {
    const own =
      "https://res.cloudinary.com/selfvibe-test/image/upload/v1700000000/selfvibe/avatars/user_abc.webp";
    assert.equal(isOwnAvatarUrl(own, "abc"), true);
    assert.equal(isOwnAvatarUrl(own, "someone-else"), false);
    assert.equal(
      isOwnAvatarUrl(
        "https://res.cloudinary.com/other-cloud/image/upload/v1/selfvibe/avatars/user_abc.webp",
        "abc"
      ),
      false
    );
    assert.equal(
      isOwnAvatarUrl("https://evil.example.com/selfvibe/avatars/user_abc.png", "abc"),
      false
    );
  });
});

describe("taste quiz → initial taste profile", () => {
  it("seeds every pick with its cold-start weight", () => {
    const weights = buildQuizTasteWeights({
      genres: ["lo-fi", "indie", "bollywood"],
      vibes: ["code", "focus"],
      artists: ["64b000000000000000000009"],
    });
    assert.deepEqual(weights, {
      genreWeights: { "lo-fi": 5, indie: 5, bollywood: 5 },
      vibeWeights: { code: 5, focus: 5 },
      artistWeights: { "64b000000000000000000009": 4 },
    });
  });

  it("ignores duplicates and works without artists", () => {
    const weights = buildQuizTasteWeights({ genres: ["pop", "pop", "rock"], vibes: ["gym"] });
    assert.deepEqual(weights.genreWeights, { pop: 5, rock: 5 });
    assert.deepEqual(weights.artistWeights, {});
  });
});

describe("validators", () => {
  it("quiz needs at least 3 genres and 2 vibes (PRD ONB-1)", () => {
    const result = onboardingSchema.safeParse({ genres: ["pop", "rock"], vibes: ["gym"] });
    assert.equal(result.success, false);
    const paths = result.error.issues.map((issue) => issue.path[0]);
    assert.ok(paths.includes("genres") && paths.includes("vibes"));
    assert.equal(
      onboardingSchema.safeParse({ genres: ["pop", "rock", "jazz"], vibes: ["gym", "code"] })
        .success,
      true
    );
  });

  it("profile edit rejects unknown fields, long bios and non-https avatars", () => {
    assert.equal(updateProfileSchema.safeParse({ role: "admin" }).success, false);
    assert.equal(updateProfileSchema.safeParse({ bio: "x".repeat(301) }).success, false);
    assert.equal(updateProfileSchema.safeParse({ avatar: "http://x.com/a.png" }).success, false);
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(updateProfileSchema.safeParse({ avatar: null }).success, true);
  });

  it("reset password needs a sane token and an 8+ character password", () => {
    assert.equal(
      resetPasswordSchema.safeParse({ token: "short", password: "password123" }).success,
      false
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: "a".repeat(43), password: "short" }).success,
      false
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: "a".repeat(43), password: "password123" }).success,
      true
    );
  });
});

describe("helpers", () => {
  it("getSafeRedirectPath only allows internal paths", () => {
    assert.equal(getSafeRedirectPath("/library"), "/library");
    assert.equal(getSafeRedirectPath("//evil.com"), null);
    assert.equal(getSafeRedirectPath("https://evil.com"), null);
    assert.equal(getSafeRedirectPath("/\\evil.com"), null);
    assert.equal(getSafeRedirectPath(undefined, "/home"), "/home");
  });

  it("reset email escapes the user's name", () => {
    const { html, text } = passwordResetEmail({
      name: '<script>alert("x")</script>',
      resetUrl: "http://localhost:3000/reset-password?token=abc",
      ttlMinutes: 30,
    });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(text.includes("30 minutes"));
  });
});

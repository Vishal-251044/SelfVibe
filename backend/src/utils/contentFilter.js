/**
 * Basic spam and abuse filter for comments (PRD CMT-3). Catches the common
 * cases cheaply — blocked words (incl. simple l33t spellings), link spam and
 * character floods. Anything it misses can still be reported by listeners and
 * removed by moderators.
 */
import { COMMENT_MAX_LINKS } from "../config/constants.js";

// Severe abuse and slurs (English + romanised Hindi). Kept short on purpose:
// ordinary strong language is allowed, targeted abuse is not.
const BLOCKED_WORDS = [
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kys",
  "killyourself",
  "madarchod",
  "maderchod",
  "bhenchod",
  "behenchod",
  "bhosdike",
  "bhosadike",
  "chutiya",
  "randi",
  "gandu",
  "harami",
];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };
const URL_PATTERN = /(https?:\/\/|www\.)\S+/gi;
const FLOOD_PATTERN = /(.)\1{14,}/; // the same character 15+ times in a row

/**
 * Lower-case, undo simple l33t spelling, drop everything but letters / spaces.
 * @param {string} text
 * @returns {string}
 */
export function normaliseForFilter(text) {
  return String(text)
    .toLowerCase()
    .replace(/[013457@$!]/g, (char) => LEET[char] ?? char)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "");
}

/**
 * Check a comment before it is saved.
 * @param {string} text
 * @returns {{ ok: true } | { ok: false, reason: string }} reason is shown to the user
 */
export function checkCommentContent(text) {
  const normalised = normaliseForFilter(text);
  const words = normalised.split(/\s+/).filter(Boolean);
  // Also catch words split with dots / spaces ("c.h.u.t.i.y.a", "k y s")
  const squashed = normalised.replace(/\s+/g, "");
  const hasBlockedWord = BLOCKED_WORDS.some(
    (word) => words.includes(word) || (word.length >= 6 && squashed.includes(word))
  );
  if (hasBlockedWord) {
    return { ok: false, reason: "Your comment contains words that aren't allowed on SelfVibe." };
  }
  if ((String(text).match(URL_PATTERN) ?? []).length > COMMENT_MAX_LINKS) {
    return { ok: false, reason: "Too many links in one comment." };
  }
  if (FLOOD_PATTERN.test(String(text))) {
    return { ok: false, reason: "Please don't repeat the same character over and over." };
  }
  return { ok: true };
}

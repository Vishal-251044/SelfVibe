/**
 * Typo-tolerant text matching for search and "play <song>" by voice
 * (PRD SRC-2, VOC-4, roadmap Day 7 "Hindi transliteration").
 * - transliterate(): Devanagari → Latin ("तुम ही हो" → "tum hi ho"), because
 *   Hindi speech recognition returns Devanagari while titles are in Latin script
 * - phoneticKey(): spelling-insensitive key ("zindagi" ≈ "jindagi", "phir" ≈ "fir",
 *   "kesariyaa" ≈ "kesariya")
 * - matchScore(): 0–1 similarity using containment, per-word edit distance and
 *   trigram overlap — tolerant of typos and missing words
 * All functions are pure (unit tested).
 */

const INDEPENDENT_VOWELS = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ऋ: "ri",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
};
const VOWEL_SIGNS = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
};
const CONSONANTS = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "n",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "n",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  क़: "q",
  ख़: "kh",
  ग़: "g",
  ज़: "z",
  ड़: "r",
  ढ़: "rh",
  फ़: "f",
};
const VIRAMA = "्";
const NUKTA = "़";
const NASALS = { "ं": "n", "ँ": "n", "ः": "h" };
const WORD_END = ""; // private-use marker: "inherent a at a word end"
const NUKTA_FORMS = { क: "क़", ख: "ख़", ग: "ग़", ज: "ज़", ड: "ड़", ढ: "ढ़", फ: "फ़" };

/**
 * Devanagari → Latin, with Hindi's silent final "a" dropped ("तुम" → "tum").
 * Latin text passes through unchanged.
 * @param {string} text
 * @returns {string}
 */
export function transliterate(text) {
  const chars = [...String(text ?? "").normalize("NFC")];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    let char = chars[i];
    if (chars[i + 1] === NUKTA && NUKTA_FORMS[char]) {
      char = NUKTA_FORMS[char];
      i += 1;
    }
    if (CONSONANTS[char]) {
      out += CONSONANTS[char];
      const next = chars[i + 1];
      if (VOWEL_SIGNS[next]) {
        out += VOWEL_SIGNS[next];
        i += 1;
      } else if (next === VIRAMA) {
        i += 1; // no vowel
      } else if (
        next &&
        (CONSONANTS[next] || NASALS[next] || VOWEL_SIGNS[next] || next === NUKTA)
      ) {
        out += "a"; // inherent vowel inside a word
      } else {
        out += "a"; // word end: dropped below (schwa deletion)
        out += WORD_END;
      }
    } else if (INDEPENDENT_VOWELS[char]) {
      out += INDEPENDENT_VOWELS[char];
    } else if (NASALS[char]) {
      out += NASALS[char];
    } else if (char !== NUKTA) {
      out += char;
    }
  }
  // Schwa deletion: drop the inherent "a" at the end of a word (but keep it in 1–2 letter words)
  return out.replace(/(\w{2,})a/g, "$1").replaceAll(WORD_END, "");
}

/**
 * Lower-case, transliterated, accent-free text with only letters, digits and spaces.
 * @param {string} text
 * @returns {string}
 */
export function normaliseText(text) {
  return transliterate(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Spelling-insensitive key for one normalised string (Hinglish spellings vary a lot).
 * @param {string} normalised - From normaliseText
 * @returns {string}
 */
export function phoneticKey(normalised) {
  return (
    normalised
      .replace(/ph/g, "f")
      .replace(/z/g, "j")
      .replace(/q/g, "k")
      .replace(/w/g, "v")
      .replace(/ck/g, "k")
      .replace(/([bcdgjkpt])h/g, "$1") // aspirated → plain (bh → b, dh → d, …)
      .replace(/sh/g, "s")
      .replace(/ee|ii/g, "i")
      .replace(/oo|uu/g, "u")
      .replace(/(.)\1+/g, "$1") // collapse doubled letters
      // Hindi drops many short "a"s ("अगला" is said "agla", written "agalaa"), and
      // Hinglish spellings add or skip them freely — so ignore "a" inside words
      .replace(/\Ba/g, "")
  );
}

/**
 * Edit distance (Levenshtein), stopping early above `max`.
 * @param {string} a
 * @param {string} b
 * @param {number} [max=Infinity]
 * @returns {number}
 */
export function editDistance(a, b, max = Infinity) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Similarity of two words (0–1); a word that starts the other scores high (search-as-you-type).
 * @param {string} queryWord
 * @param {string} word
 * @returns {number}
 */
function wordSimilarity(queryWord, word) {
  if (queryWord === word) return 1;
  if (word.startsWith(queryWord)) return 0.75 + 0.25 * (queryWord.length / word.length);
  const longest = Math.max(queryWord.length, word.length);
  // Allow about one typo per four letters
  const allowed = Math.max(1, Math.floor(longest / 4));
  const distance = editDistance(queryWord, word, allowed);
  return distance > allowed ? 0 : 1 - distance / longest;
}

/**
 * Trigram (Dice) overlap of two strings, 0–1.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function trigramOverlap(a, b) {
  const grams = (text) => {
    const padded = `  ${text} `;
    const set = new Set();
    for (let i = 0; i < padded.length - 2; i += 1) set.add(padded.slice(i, i + 3));
    return set;
  };
  const first = grams(a);
  const second = grams(b);
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  first.forEach((gram) => (shared += second.has(gram) ? 1 : 0));
  return (2 * shared) / (first.size + second.size);
}

/**
 * Prepare a candidate text once (cache it next to the item).
 * @param {string} text
 * @returns {{ key: string, words: string[] }}
 */
export function prepareText(text) {
  const key = phoneticKey(normaliseText(text));
  return { key, words: key.split(" ").filter(Boolean) };
}

/**
 * How well a query matches a prepared text, 0–1.
 * @param {{ key: string, words: string[] }} query - prepareText(query)
 * @param {{ key: string, words: string[] }} target - prepareText(title or name)
 * @returns {number}
 */
export function matchScore(query, target) {
  if (!query.key || !target.key) return 0;
  if (query.key === target.key) return 1;
  // Whole query inside the target ("tum hi" in "tum hi ho")
  if (target.key.includes(query.key)) {
    return 0.86 + 0.12 * (query.key.length / target.key.length);
  }
  // Same letters, different spacing ("lofi" = "lo fi", "hiphop" = "hip hop")
  const compactQuery = query.key.replace(/ /g, "");
  const compactTarget = target.key.replace(/ /g, "");
  if (compactTarget === compactQuery) return 0.98;
  if (compactQuery.length >= 4 && compactTarget.includes(compactQuery)) {
    return 0.84 + 0.12 * (compactQuery.length / compactTarget.length);
  }
  // Each query word against its best target word
  const wordScores = query.words.map((word) =>
    Math.max(0, ...target.words.map((other) => wordSimilarity(word, other)))
  );
  const wordScore = wordScores.reduce((total, score) => total + score, 0) / query.words.length;
  // Penalise targets with many words the query didn't mention (a bit)
  const coverage = Math.min(1, query.words.length / target.words.length);
  const trigram = trigramOverlap(query.key, target.key);
  return Math.min(0.97, 0.65 * wordScore + 0.15 * coverage + 0.2 * trigram);
}

/**
 * Does the text contain Devanagari letters?
 * @param {string} text
 * @returns {boolean}
 */
export function hasDevanagari(text) {
  return /[ऀ-ॿ]/.test(String(text ?? ""));
}

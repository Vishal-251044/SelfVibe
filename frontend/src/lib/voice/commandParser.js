/**
 * Voice command parser (PRD VOC-3, roadmap Day 7): rule-based, runs on the
 * device, no network. Understands English, Hindi (Devanagari, as Hindi speech
 * recognition returns it) and Hinglish ("agla gaana", "Tum Hi Ho chalao").
 * Pure — no imports — so it can be unit tested directly.
 *
 * Result intents: next, previous, pause, resume, volumeUp, volumeDown,
 * volumeSet, mute, unmute, like, unlike, shuffleOn, shuffleOff, repeatOne,
 * repeatAll, repeatOff, whatsPlaying, play (with `query`), addToPlaylist
 * (with `playlist`), unknown.
 */

/** Words people put around commands that change nothing. */
const LEADING_FILLERS =
  /^(?:(?:hey|ok|okay|hi)\s+self\s?vibe\s+|please\s+|can you\s+|could you\s+|zara\s+|ज़रा\s+|जरा\s+|plz\s+)+/;
const TRAILING_FILLERS = /(?:\s+(?:please|plz|now|abhi|अभी|na|ना|yaar|यार))+$/;

/** Phrases that mean "play" when they come before the name. */
const PLAY_PREFIX =
  /^(?:play|put on|start playing|start|bajao|chalao|sunao|lagao|chala do|baja do|suna do|laga do|चलाओ|बजाओ|सुनाओ|लगाओ|चला दो|बजा दो|सुना दो|लगा दो)\s+(.+)$/;
/** Hindi word order: the name first, then "play". */
const PLAY_SUFFIX =
  /^(.+?)\s+(?:play karo|play kar do|chalao|chala do|bajao|baja do|sunao|suna do|lagao|laga do|चलाओ|चला दो|बजाओ|बजा दो|सुनाओ|सुना दो|लगाओ|लगा दो|प्ले करो)$/;
/** Words around the name in "play …" that aren't part of it. */
const QUERY_NOISE_START =
  /^(?:the song|song|songs|the track|track|some|a song|gaana|gana|गाना|गाने|kuch|कुछ)\s+/;
/** "play it again", "phir se chalao" — about the current song, not a name. */
const NOT_A_NAME =
  /^(?:(?:the )?(?:next|previous|last)(?: song| track| one)?|it|it again|this|this again|again|music|the music|this song again|phir se|dobara|gaana|गाना|फिर से|दोबारा)$/;
const QUERY_NOISE_END =
  /\s+(?:song|songs|track|gaana|gana|gaane|गाना|गाने|wala|wala gaana|वाला|वाला गाना)$/;

/** [intent, pattern] — checked in this order; the first match wins. */
const RULES = [
  [
    "whatsPlaying",
    /(?:what(?:s| is)\s+(?:playing|this song|this track|the song)|which song is this|what song is this|name of (?:this|the) song|kaun ?sa gaana|kon ?sa gana|konsa gaana|ye kaun ?sa|कौन सा गाना|कौनसा गाना|क्या चल रहा|ये कौन सा)/,
  ],
  [
    "repeatOff",
    /(?:repeat\s+(?:off|band|बंद)|stop repeat(?:ing)?|no repeat|turn off repeat|रिपीट बंद)/,
  ],
  [
    "repeatOne",
    /(?:repeat\s+(?:this|this song|the song|one|this track|it|ise|isko|ye gaana)|loop (?:this|it)|play (?:it|this) again|isko (?:dobara|phir se)|ye gaana (?:dobara|phir se)|दोबारा|फिर से|इसे रिपीट)/,
  ],
  [
    "repeatAll",
    /^(?:repeat(?:\s+(?:all|on|everything|chalu|चालू))?|रिपीट(?:\s+चालू)?|turn on repeat)$/,
  ],
  [
    "shuffleOff",
    /(?:shuffle\s+(?:off|band|बंद)|stop shuffl\w*|no shuffle|turn off shuffle|शफल बंद)/,
  ],
  [
    "shuffleOn",
    /(?:^shuffle(?:\s+(?:on|chalu|karo|kar do|it|my songs|songs))?$|turn on shuffle|^शफल(?:\s+(?:चालू|करो))?$)/,
  ],
  [
    "unmute",
    /(?:unmute|sound on|awaaz (?:wapas|chalu|on)|aawaz (?:wapas|chalu)|आवाज़ (?:वापस|चालू)|आवाज (?:वापस|चालू))/,
  ],
  ["mute", /(?:^mute(?:\s+it)?$|^silent$|awaaz band|aawaz band|आवाज़ बंद|आवाज बंद|^म्यूट)/],
  [
    "unlike",
    /(?:^unlike|^dislike|remove (?:the )?like|remove (?:it |this )?from (?:my )?liked|like hatao|pasand nahi|पसंद नहीं|लाइक हटाओ)/,
  ],
  [
    "like",
    /(?:^(?:like|love|heart)(?:\s+(?:this|it|this song|the song|this track|karo|kar do))?$|i (?:like|love) (?:this|it)|(?:isko|ise|ye gaana) (?:like|pasand)|pasand (?:hai|aaya|karo)|^पसंद|लाइक करो|ये गाना पसंद)/,
  ],
  [
    "next",
    /(?:^(?:next|skip|agla|aage|अगला|आगे)(?:\s+(?:song|track|one|gaana|gana|गाना|please))?$|^skip (?:this|it|song|this song|the song)$|next song|next track|agla gaana|agla gana|अगला गाना|change (?:the )?song|gaana badlo|गाना बदलो|^aage badho$)/,
  ],
  [
    "previous",
    /(?:^(?:previous|back|pichla|pichhla|पिछला|peeche|पीछे)(?:\s+(?:song|track|one|gaana|gana|गाना))?$|go back|last song|previous song|pichla gaana|pichhla gaana|पिछला गाना)/,
  ],
  [
    "pause",
    /^(?:pause|stop|hold|hold on|wait|ruko|ruk jao|ruk|band karo|thamo|रुको|रुक जाओ|रुक|बंद करो|थामो|पॉज़|पॉज)(?:\s+(?:it|this|the music|music|gaana|गाना|karo|कर दो))?$/,
  ],
  [
    "resume",
    /^(?:resume|continue|unpause|play|play it|play music|keep playing|chalao|chalu karo|shuru karo|phir se chalao|चलाओ|चालू करो|शुरू करो|बजाओ|प्ले)(?:\s+(?:it|again|music|gaana|गाना))?$/,
  ],
];

const VOLUME_WORD = "(?:volume|awaaz|aawaz|awaz|sound|आवाज़|आवाज|वॉल्यूम)";
const VOLUME_SET = new RegExp(
  `${VOLUME_WORD}\\s+(?:to\\s+|pe\\s+|par\\s+|पर\\s+)?(\\d{1,3})(?:\\s*(?:percent|%|प्रतिशत))?`
);
const VOLUME_UP = new RegExp(
  `(?:${VOLUME_WORD}\\s+(?:up|badhao|badha do|tez karo|increase|zyada|बढ़ाओ|बढ़ा दो|तेज़ करो|तेज करो)|louder|turn it up|increase (?:the )?volume)`
);
const VOLUME_DOWN = new RegExp(
  `(?:${VOLUME_WORD}\\s+(?:down|kam karo|kam|ghatao|decrease|dheere|कम करो|कम|घटाओ|धीमी करो)|quieter|softer|turn it down|decrease (?:the )?volume|lower (?:the )?volume)`
);
const ADD_TO_PLAYLIST = [
  /^(?:add|put|save)(?:\s+(?:this|it|this song|the song|this track))?\s+to\s+(?:my\s+)?(?:playlist\s+)?(.+?)(?:\s+playlist)?$/,
  /^(?:isko|ise|ye gaana|इसे|ये गाना)?\s*(.+?)\s+(?:playlist|प्लेलिस्ट)\s+(?:me|mein|में)\s+(?:add karo|daalo|dalo|daal do|jodo|जोड़ो|डालो|ऐड करो)$/,
];

/**
 * Lower-case, punctuation-free transcript with fillers removed.
 * @param {string} transcript
 * @returns {string}
 */
export function normaliseTranscript(transcript) {
  return String(transcript ?? "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/['’]/g, "")
    .replace(/[.,!?।॥"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_FILLERS, "")
    .replace(TRAILING_FILLERS, "")
    .trim();
}

/**
 * Clean the name from a "play …" request ("play the song tum hi ho" → "tum hi ho").
 * @param {string} query
 * @returns {string}
 */
function cleanQuery(query) {
  return query.replace(QUERY_NOISE_START, "").replace(QUERY_NOISE_END, "").trim();
}

/**
 * Understand one spoken command.
 * @param {string} transcript - What the speech engine heard
 * @returns {{ intent: string, query?: string, value?: number, playlist?: string, text: string }}
 */
export function parseVoiceCommand(transcript) {
  const text = normaliseTranscript(transcript);
  if (!text) return { intent: "unknown", text };

  const volume = VOLUME_SET.exec(text);
  if (volume) {
    return { intent: "volumeSet", value: Math.min(100, Number(volume[1])) / 100, text };
  }
  if (VOLUME_UP.test(text)) return { intent: "volumeUp", text };
  if (VOLUME_DOWN.test(text)) return { intent: "volumeDown", text };

  for (const pattern of ADD_TO_PLAYLIST) {
    const match = pattern.exec(text);
    if (match?.[1]) return { intent: "addToPlaylist", playlist: match[1].trim(), text };
  }

  // "play <name>" wins over command words inside the name ("play next to me")
  const prefixed = PLAY_PREFIX.exec(text);
  if (prefixed && !NOT_A_NAME.test(prefixed[1])) {
    const query = cleanQuery(prefixed[1]);
    if (query) return { intent: "play", query, text };
  }

  for (const [intent, pattern] of RULES) {
    if (pattern.test(text)) return { intent, text };
  }

  const suffixed = PLAY_SUFFIX.exec(text);
  if (suffixed && !NOT_A_NAME.test(suffixed[1])) {
    const query = cleanQuery(suffixed[1]);
    if (query) return { intent: "play", query, text };
  }
  return { intent: "unknown", text };
}

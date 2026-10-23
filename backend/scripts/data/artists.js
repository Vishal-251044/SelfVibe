/**
 * Starter artist profiles for the taste quiz (India first, then worldwide).
 * Tags use the genre / vibe slugs from ./taxonomy.js. `wiki` is the English
 * Wikipedia page title used to fetch a freely licensed photo (Wikimedia Commons).
 * Music uploaded later from the admin console is attached to these profiles
 * by slug, so quiz picks connect to real tracks.
 */

/**
 * @param {string} stageName
 * @param {string} wiki - Wikipedia page title
 * @param {string} country - ISO 3166-1 alpha-2
 * @param {string[]} genres
 * @param {string[]} vibes
 * @param {number} popularity - 0–100 editorial rank
 */
const artist = (stageName, wiki, country, genres, vibes, popularity) => ({
  stageName,
  slug: stageName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
  wiki,
  country,
  genres,
  vibes,
  popularity,
});

export const ARTISTS = [
  // ===== India =====
  artist(
    "Arijit Singh",
    "Arijit_Singh",
    "IN",
    ["bollywood", "pop"],
    ["chill", "travel", "sleep"],
    100
  ),
  artist(
    "Shreya Ghoshal",
    "Shreya_Ghoshal",
    "IN",
    ["bollywood", "classical"],
    ["chill", "happy"],
    95
  ),
  artist(
    "A. R. Rahman",
    "A._R._Rahman",
    "IN",
    ["bollywood", "classical", "electronic"],
    ["focus", "travel"],
    97
  ),
  artist("Pritam", "Pritam", "IN", ["bollywood", "pop"], ["happy", "party", "travel"], 88),
  artist("Sonu Nigam", "Sonu_Nigam", "IN", ["bollywood", "pop"], ["chill", "happy"], 85),
  artist(
    "Lata Mangeshkar",
    "Lata_Mangeshkar",
    "IN",
    ["bollywood", "classical"],
    ["chill", "sleep"],
    90
  ),
  artist("Kishore Kumar", "Kishore_Kumar", "IN", ["bollywood"], ["happy", "travel"], 90),
  artist(
    "Mohammed Rafi",
    "Mohammed_Rafi",
    "IN",
    ["bollywood", "classical"],
    ["chill", "sleep"],
    86
  ),
  artist(
    "Neha Kakkar",
    "Neha_Kakkar",
    "IN",
    ["bollywood", "pop", "punjabi"],
    ["party", "happy"],
    84
  ),
  artist("Jubin Nautiyal", "Jubin_Nautiyal", "IN", ["bollywood", "pop"], ["chill", "sleep"], 80),
  artist("Armaan Malik", "Armaan_Malik", "IN", ["bollywood", "pop"], ["happy", "chill"], 76),
  artist("Mohit Chauhan", "Mohit_Chauhan", "IN", ["bollywood", "indie"], ["travel", "chill"], 75),
  artist("Amit Trivedi", "Amit_Trivedi", "IN", ["bollywood", "indie"], ["happy", "travel"], 74),
  artist(
    "Vishal–Shekhar",
    "Vishal–Shekhar",
    "IN",
    ["bollywood", "electronic"],
    ["party", "gym"],
    73
  ),
  artist(
    "Shankar Mahadevan",
    "Shankar_Mahadevan",
    "IN",
    ["classical", "bollywood"],
    ["focus", "happy"],
    72
  ),
  artist(
    "Diljit Dosanjh",
    "Diljit_Dosanjh",
    "IN",
    ["punjabi", "pop"],
    ["party", "happy", "gym"],
    92
  ),
  artist(
    "AP Dhillon",
    "AP_Dhillon",
    "IN",
    ["punjabi", "hip-hop", "r-and-b"],
    ["chill", "travel", "party"],
    88
  ),
  artist(
    "Sidhu Moose Wala",
    "Sidhu_Moose_Wala",
    "IN",
    ["punjabi", "hip-hop"],
    ["gym", "party"],
    89
  ),
  artist("Karan Aujla", "Karan_Aujla", "IN", ["punjabi", "hip-hop"], ["gym", "party"], 82),
  artist("Badshah", "Badshah_(rapper)", "IN", ["hip-hop", "punjabi", "pop"], ["party", "gym"], 83),
  artist("Divine", "Divine_(rapper)", "IN", ["hip-hop"], ["gym", "focus"], 80),
  artist("Raftaar", "Raftaar_(rapper)", "IN", ["hip-hop"], ["gym", "party"], 74),
  artist("Seedhe Maut", "Seedhe_Maut", "IN", ["hip-hop"], ["gym", "focus", "code"], 70),
  artist("King", "King_(singer)", "IN", ["hip-hop", "pop"], ["party", "chill"], 78),
  artist(
    "Prateek Kuhad",
    "Prateek_Kuhad",
    "IN",
    ["indie", "indie-pop"],
    ["chill", "sleep", "focus"],
    82
  ),
  artist("Anuv Jain", "Anuv_Jain", "IN", ["indie-pop", "indie"], ["chill", "sleep"], 80),
  artist("Lucky Ali", "Lucky_Ali", "IN", ["indie", "pop"], ["travel", "chill"], 76),
  artist("Ritviz", "Ritviz", "IN", ["electronic", "indie-pop"], ["party", "gym", "happy"], 77),
  artist("Nucleya", "Nucleya", "IN", ["electronic"], ["party", "gym"], 75),
  artist("The Local Train", "The_Local_Train", "IN", ["rock", "indie"], ["travel", "gym"], 70),
  artist("Indian Ocean", "Indian_Ocean_(band)", "IN", ["rock", "indie"], ["travel", "focus"], 66),
  artist("Zakir Hussain", "Zakir_Hussain_(musician)", "IN", ["classical"], ["focus", "code"], 72),
  artist(
    "Anoushka Shankar",
    "Anoushka_Shankar",
    "IN",
    ["classical", "ambient"],
    ["focus", "sleep", "code"],
    68
  ),
  artist(
    "Hariharan",
    "Hariharan_(singer)",
    "IN",
    ["classical", "devotional"],
    ["chill", "sleep"],
    70
  ),
  artist(
    "Kailash Kher",
    "Kailash_Kher",
    "IN",
    ["devotional", "indie", "bollywood"],
    ["happy", "travel"],
    72
  ),
  artist("Anuradha Paudwal", "Anuradha_Paudwal", "IN", ["devotional"], ["chill", "sleep"], 65),

  // ===== Worldwide =====
  artist("Taylor Swift", "Taylor_Swift", "US", ["pop"], ["happy", "chill"], 98),
  artist("Ed Sheeran", "Ed_Sheeran", "GB", ["pop"], ["chill", "happy", "travel"], 95),
  artist("The Weeknd", "The_Weeknd", "CA", ["r-and-b", "pop"], ["party", "travel"], 94),
  artist("Dua Lipa", "Dua_Lipa", "GB", ["pop", "electronic"], ["party", "gym", "happy"], 90),
  artist("Billie Eilish", "Billie_Eilish", "US", ["pop", "indie-pop"], ["chill", "sleep"], 91),
  artist("Bruno Mars", "Bruno_Mars", "US", ["pop", "r-and-b"], ["happy", "party"], 90),
  artist("BTS", "BTS", "KR", ["pop"], ["happy", "gym"], 92),
  artist("Drake", "Drake_(musician)", "CA", ["hip-hop", "r-and-b"], ["party", "chill"], 93),
  artist("Eminem", "Eminem", "US", ["hip-hop"], ["gym", "focus"], 92),
  artist("Kendrick Lamar", "Kendrick_Lamar", "US", ["hip-hop"], ["focus", "gym"], 90),
  artist("Travis Scott", "Travis_Scott", "US", ["hip-hop"], ["gym", "party"], 86),
  artist("SZA", "SZA", "US", ["r-and-b"], ["chill", "sleep"], 84),
  artist("Beyoncé", "Beyoncé", "US", ["r-and-b", "pop"], ["party", "gym"], 90),
  artist("Coldplay", "Coldplay", "GB", ["rock", "pop"], ["travel", "happy"], 92),
  artist("Imagine Dragons", "Imagine_Dragons", "US", ["rock", "pop"], ["gym", "travel"], 86),
  artist("Linkin Park", "Linkin_Park", "US", ["rock"], ["gym", "focus"], 88),
  artist("Arctic Monkeys", "Arctic_Monkeys", "GB", ["indie", "rock"], ["travel", "chill"], 84),
  artist("Daft Punk", "Daft_Punk", "FR", ["electronic"], ["party", "code", "gym"], 88),
  artist("Calvin Harris", "Calvin_Harris", "GB", ["electronic", "pop"], ["party", "gym"], 85),
  artist("Avicii", "Avicii", "SE", ["electronic"], ["happy", "travel", "gym"], 87),
  artist("Martin Garrix", "Martin_Garrix", "NL", ["electronic"], ["party", "gym"], 82),
  artist("Hans Zimmer", "Hans_Zimmer", "DE", ["classical", "ambient"], ["focus", "code"], 88),
  artist(
    "Ludovico Einaudi",
    "Ludovico_Einaudi",
    "IT",
    ["classical", "ambient"],
    ["focus", "sleep", "code"],
    82
  ),
  artist("Brian Eno", "Brian_Eno", "GB", ["ambient", "electronic"], ["focus", "sleep", "code"], 74),
  artist("Nujabes", "Nujabes", "JP", ["lo-fi", "hip-hop", "jazz"], ["chill", "code", "focus"], 78),
  artist("Norah Jones", "Norah_Jones", "US", ["jazz"], ["chill", "sleep"], 78),
  artist("Miles Davis", "Miles_Davis", "US", ["jazz"], ["focus", "chill", "code"], 80),
  artist(
    "Nusrat Fateh Ali Khan",
    "Nusrat_Fateh_Ali_Khan",
    "PK",
    ["devotional", "classical"],
    ["chill", "travel"],
    84
  ),
];

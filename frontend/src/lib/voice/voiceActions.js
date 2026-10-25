/**
 * Carry out a parsed voice command (PRD VOC-3/4/5/8, roadmap Day 7) and
 * build the reply shown in the terminal toast (and optionally spoken).
 * Player commands act instantly; "play <name>" asks the API for the best
 * match (Official first, CAT-5) and returns a top-3 picker when unsure.
 */
import { usePlayerStore } from "@/store/playerStore";
import { voiceSearch } from "@/services/search.service";
import { getCategory, getTrending } from "@/services/browse.service";
import { getArtistPage } from "@/services/creator.service";
import { addTracksToPlaylist, getMyPlaylists, getPlaylist } from "@/services/playlist.service";
import { likeTrack, unlikeTrack } from "@/services/library.service";
import { QUERY_KEYS } from "@/utils/constants";
import { VOICE_VOLUME_STEP } from "@/utils/musicConstants";
import { normaliseTranscript } from "@/lib/voice/commandParser";

const PLAY_QUEUE_LIMIT = 50;

/**
 * Reply in the listener's voice language.
 * @param {"en-IN"|"hi-IN"} language
 * @param {string} en
 * @param {string} hi
 * @returns {string}
 */
const say = (language, en, hi) => (language === "hi-IN" ? hi : en);

/**
 * @typedef {Object} VoiceOutcome
 * @property {"done"|"picker"|"not_found"|"failed"} outcome - Logged (VOC-7)
 * @property {string} message - The ">> …" line
 * @property {"success"|"error"|"info"} tone
 * @property {Object} [picker] - { query, candidates, notFound, suggestions }
 */

/**
 * @param {string} message
 * @param {Object} [extra]
 * @returns {VoiceOutcome}
 */
const done = (message, extra = {}) => ({ outcome: "done", tone: "success", message, ...extra });
/** @param {string} message @returns {VoiceOutcome} */
const failed = (message) => ({ outcome: "failed", tone: "error", message });

/**
 * Start playing a search candidate (song, artist, playlist, genre or vibe).
 * @param {{ type: string, item: Object }} candidate
 * @param {{ language: string, catalog: string }} context
 * @returns {Promise<VoiceOutcome>}
 */
export async function playCandidate({ type, item }, { language, catalog }) {
  const player = usePlayerStore.getState();
  const start = (tracks, label) => {
    if (tracks.length === 0)
      return failed(say(language, `nothing to play in ${label}`, `${label} में कोई गाना नहीं`));
    player.playQueue(tracks.slice(0, PLAY_QUEUE_LIMIT), 0, { source: "voice" });
    return done(say(language, `playing ${label}`, `${label} चल रहा है`));
  };

  if (type === "track") {
    player.playQueue([item], 0, { source: "voice" });
    const label = item.artist ? `${item.title} by ${item.artist.stageName}` : item.title;
    return done(say(language, `playing ${label}`, `${label} चल रहा है`));
  }
  if (type === "artist") {
    const page = await getArtistPage(item.slug ?? item.id);
    return start(page.tracks ?? [], item.stageName);
  }
  if (type === "playlist") {
    const { playlist } = await getPlaylist(item.id);
    return start(playlist.tracks ?? [], playlist.name);
  }
  // genre / vibe: its most played songs, shuffled order is left to the user
  const { items } = await getCategory(type, item.slug, { catalog, limit: PLAY_QUEUE_LIMIT });
  return start(items, `${item.name} ${type}`);
}

/**
 * "play <name>": best match, a top-3 picker, or "No match" with suggestions.
 * @param {string} query
 * @param {{ language: string, catalog: string }} context
 * @returns {Promise<VoiceOutcome>}
 */
async function playByName(query, context) {
  const result = await voiceSearch(query, context.catalog);
  if (result.best && result.confident) return playCandidate(result.best, context);
  if (result.candidates.length > 0) {
    return {
      outcome: "picker",
      tone: "info",
      message: say(context.language, `which one did you mean?`, `कौन सा चलाऊँ?`),
      picker: { query, candidates: result.candidates, notFound: false },
    };
  }
  // VOC-8: say so, and offer something to play instead
  const trending = await getTrending({ catalog: context.catalog, limit: 3 }).catch(() => ({
    items: [],
  }));
  return {
    outcome: "not_found",
    tone: "error",
    message: `No match for '${query}'`,
    picker: {
      query,
      notFound: true,
      candidates: trending.items.map((track) => ({ type: "track", score: 0, item: track })),
    },
  };
}

/**
 * Like / unlike the current song and refresh the heart icons.
 * @param {boolean} like
 * @param {{ language: string, queryClient: import("@tanstack/react-query").QueryClient }} context
 * @returns {Promise<VoiceOutcome>}
 */
async function setLiked(like, { language, queryClient }) {
  const track = usePlayerStore.getState().currentTrack();
  if (!track) return failed(say(language, "nothing is playing", "अभी कुछ नहीं चल रहा"));
  await (like ? likeTrack(track.id) : unlikeTrack(track.id));
  queryClient.setQueryData(QUERY_KEYS.likedIds, (current) => {
    const ids = (current?.trackIds ?? []).filter((id) => id !== track.id);
    return { trackIds: like ? [track.id, ...ids] : ids };
  });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likedTracks });
  return like
    ? done(
        say(language, `added ${track.title} to Liked Songs`, `${track.title} पसंदीदा में जुड़ गया`)
      )
    : done(
        say(language, `removed ${track.title} from Liked Songs`, `${track.title} पसंदीदा से हटाया`)
      );
}

/**
 * "Add to playlist Coding": the current song into one of my playlists.
 * @param {string} name
 * @param {{ language: string, queryClient: import("@tanstack/react-query").QueryClient }} context
 * @returns {Promise<VoiceOutcome>}
 */
async function addToPlaylist(name, { language, queryClient }) {
  const track = usePlayerStore.getState().currentTrack();
  if (!track) return failed(say(language, "nothing is playing", "अभी कुछ नहीं चल रहा"));
  const { playlists } = await getMyPlaylists();
  const wanted = normaliseTranscript(name).replace(/\s+/g, "");
  const match =
    playlists.find(
      (playlist) => normaliseTranscript(playlist.name).replace(/\s+/g, "") === wanted
    ) ??
    playlists.find((playlist) =>
      normaliseTranscript(playlist.name).replace(/\s+/g, "").includes(wanted)
    );
  if (!match) {
    return {
      outcome: "not_found",
      tone: "error",
      message: say(language, `No playlist called '${name}'`, `'${name}' नाम की कोई प्लेलिस्ट नहीं`),
    };
  }
  await addTracksToPlaylist(match.id, [track.id]);
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(match.id) });
  return done(say(language, `added to ${match.name}`, `${match.name} में जोड़ दिया`));
}

/**
 * Run a parsed command.
 * @param {{ intent: string, query?: string, value?: number, playlist?: string }} command
 * @param {{ language: "en-IN"|"hi-IN", catalog: string, queryClient: import("@tanstack/react-query").QueryClient }} context
 * @returns {Promise<VoiceOutcome>}
 */
export async function runVoiceCommand(command, context) {
  const { language } = context;
  const player = usePlayerStore.getState();
  const current = player.currentTrack();
  const needsTrack = !["play", "unknown", "addToPlaylist", "like", "unlike"].includes(
    command.intent
  );
  if (needsTrack && !current) {
    return failed(
      say(
        language,
        "nothing is playing — try 'play' and a song name",
        "अभी कुछ नहीं चल रहा — बोलें 'चलाओ' और गाने का नाम"
      )
    );
  }

  switch (command.intent) {
    case "next":
      player.next();
      return done(say(language, "skipping to next track", "अगला गाना"));
    case "previous":
      player.previous(Infinity);
      return done(say(language, "back to previous track", "पिछला गाना"));
    case "pause":
      player.pause();
      return done(say(language, "paused", "रोक दिया"));
    case "resume":
      player.play();
      return done(say(language, "resuming playback", "फिर से चल रहा है"));
    case "volumeUp":
    case "volumeDown": {
      const step = command.intent === "volumeUp" ? VOICE_VOLUME_STEP : -VOICE_VOLUME_STEP;
      player.setVolume(player.volume + step);
      const percent = Math.round(usePlayerStore.getState().volume * 100);
      return done(say(language, `volume ${percent}%`, `आवाज़ ${percent}%`));
    }
    case "volumeSet":
      player.setVolume(command.value);
      return done(
        say(
          language,
          `volume ${Math.round(command.value * 100)}%`,
          `आवाज़ ${Math.round(command.value * 100)}%`
        )
      );
    case "mute":
      if (!player.muted) player.toggleMute();
      return done(say(language, "muted", "आवाज़ बंद"));
    case "unmute":
      if (player.muted) player.toggleMute();
      return done(say(language, "sound on", "आवाज़ चालू"));
    case "like":
    case "unlike":
      return setLiked(command.intent === "like", context);
    case "shuffleOn":
    case "shuffleOff":
      player.setShuffle(command.intent === "shuffleOn");
      return done(
        command.intent === "shuffleOn"
          ? say(language, "shuffle on", "शफल चालू")
          : say(language, "shuffle off", "शफल बंद")
      );
    case "repeatOne":
      player.setRepeat("one");
      return done(say(language, `repeating ${current.title}`, `${current.title} दोहराया जाएगा`));
    case "repeatAll":
      player.setRepeat("all");
      return done(say(language, "repeat on", "रिपीट चालू"));
    case "repeatOff":
      player.setRepeat("off");
      return done(say(language, "repeat off", "रिपीट बंद"));
    case "whatsPlaying": {
      const label = current.artist
        ? `${current.title} by ${current.artist.stageName}`
        : current.title;
      return {
        outcome: "done",
        tone: "info",
        message: say(language, `now playing: ${label}`, `अभी चल रहा है: ${label}`),
      };
    }
    case "addToPlaylist":
      return addToPlaylist(command.playlist, context);
    case "play":
      return playByName(command.query, context);
    default:
      return {
        outcome: "failed",
        tone: "error",
        message: say(
          language,
          "didn't catch that — try 'next song' or 'play' and a name",
          "समझ नहीं आया — बोलें 'अगला गाना' या 'चलाओ' और नाम"
        ),
      };
  }
}

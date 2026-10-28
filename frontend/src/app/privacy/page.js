/**
 * Privacy Policy (/privacy, PRD §14 Privacy, roadmap Day 10). Plain-language
 * draft describing what the app actually stores; have it reviewed before launch.
 */
import LegalPage from "@/components/features/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "What SelfVibe stores about you, why, and how to download or delete it.",
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "Your account: name, email address, password (stored only as a secure hash) or your Google sign-in, profile photo and bio.",
      "What you do in the app: songs you play, skip, like or save, artists you follow, playlists, comments, searches and the taste quiz. This is how SelfVibe learns what you like.",
      'Voice control: only the text of a command (for example "play next") is kept to improve recognition. Your microphone is used only while you tap or hold the mic button, and no audio is ever stored.',
      "Basic technical data: device type, browser and IP address, used for security (sign-in protection, rate limits) and error reports.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To run your account, play music, and personalise your Home feed, Daily Mixes and recommendations.",
      "To keep SelfVibe safe: stopping abuse, spam and attempts to break into accounts, and reviewing reported content.",
      "To show creators how their songs perform (plays, listeners, likes) as totals. Creators never see who you are from these numbers.",
      "We don't sell your personal data.",
    ],
  },
  {
    heading: "Who can see what",
    body: [
      "Your listening history is private. Public playlists and your comments are visible to other listeners. Private playlists are visible only to you.",
      "Service providers that run SelfVibe for us process data on our behalf: hosting, database (MongoDB Atlas), media storage (Cloudinary), email (Resend) and error tracking (Sentry).",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "Download your data at any time from Profile → App & privacy → Download my data.",
      "Delete your account from Profile → App & privacy → Delete my account. Your account, playlists, likes, history and uploads are removed; comments are blanked.",
      "Questions or requests: support@selfvibe.ai.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "SelfVibe uses only the cookies it needs to keep you signed in securely. There are no advertising or tracking cookies.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "If this policy changes in a way that matters, we'll tell you in the app before it takes effect.",
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="31 October 2026" sections={SECTIONS} />;
}

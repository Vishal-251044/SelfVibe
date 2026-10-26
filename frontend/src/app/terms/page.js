/**
 * Terms of Use (/terms, PRD risk table "clear terms of use, moderation, no
 * voice cloning", roadmap Day 10). Plain-language draft; have it reviewed before launch.
 */
import LegalPage from "@/components/features/legal/LegalPage";

export const metadata = {
  title: "Terms of Use",
  description: "The rules for listening, uploading and commenting on SelfVibe.",
};

const SECTIONS = [
  {
    heading: "Using SelfVibe",
    body: [
      "SelfVibe is a music streaming service for listeners and creators. You need an account to listen. Keep your password safe; you're responsible for what happens in your account.",
      "Music is for personal, non-commercial listening inside SelfVibe. Don't download, copy or redistribute streams.",
    ],
  },
  {
    heading: "Uploading music",
    body: [
      "Only upload music you made or have the rights to share. By uploading, you confirm this and allow SelfVibe to store, stream and promote the song inside the service.",
      "No music that copies or imitates a real artist's voice or name without permission.",
      "We may remove songs that break these terms or the law, or after a valid rights complaint.",
    ],
  },
  {
    heading: "Community rules",
    body: [
      "Be respectful in comments. No harassment, hate, spam, sexual content involving minors, threats or illegal content.",
      "Anyone can report a song, artist or comment. Our team reviews reports and may hide content, warn, or suspend accounts.",
    ],
  },
  {
    heading: "Plans",
    body: [
      "Free, Premium and Creator Pro plans have the limits shown on the pricing page. Paid plans are billed monthly or yearly through Razorpay and renew automatically until you cancel; the price is shown before you pay.",
      "Cancelling, failed payments and refunds are covered by the Refund & Cancellation Policy at /refunds.",
    ],
  },
  {
    heading: "Ending your account",
    body: [
      "You can delete your account at any time from your profile. We may suspend accounts that seriously or repeatedly break these terms.",
    ],
  },
  {
    heading: "The service",
    body: [
      "We work hard to keep SelfVibe running, but it's provided as it is, and features may change. To the extent the law allows, SelfVibe isn't liable for indirect losses from using the service.",
      "These terms are governed by the laws of India. Contact: support@selfvibe.ai.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      command="selfvibe terms"
      title="Terms of Use"
      updated="31 October 2026"
      sections={SECTIONS}
    />
  );
}

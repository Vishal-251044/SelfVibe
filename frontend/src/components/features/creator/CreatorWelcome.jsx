"use client";

/**
 * Creator studio before the first upload (PRD CRT-1): every signed-in user can
 * upload — there is no separate sign-up step. The first upload creates the
 * artist page automatically.
 */
import { motion } from "framer-motion";
import { AudioLines, BarChart3, ShieldCheck, Upload, UploadCloud } from "lucide-react";
import Button from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import UploadAllowance from "@/components/features/creator/UploadAllowance";
import { fadeUp } from "@/utils/animations";

const PERKS = [
  {
    icon: UploadCloud,
    title: "Upload your music",
    text: "MP3, WAV, FLAC or M4A — we prepare a streaming copy that plays fast on any connection.",
  },
  {
    icon: AudioLines,
    title: "Your artist page",
    text: "Your first upload creates a public page with your songs to share anywhere.",
  },
  {
    icon: BarChart3,
    title: "Reach listeners",
    text: "Community songs join search, vibes and personalised recommendations.",
  },
];

export default function CreatorWelcome() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <p className="mb-2 font-mono text-[11px] tracking-widest text-neon uppercase sm:text-xs">
          $ selfvibe studio --init
        </p>
        <h1 className="font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
          Share your music with the world
        </h1>
        <p className="mt-3 max-w-xl text-fg-muted">
          Anyone on SelfVibe can upload their own songs. No approval needed — just your music and
          the rights to share it.
        </p>
        <Stagger className="mt-8 space-y-4" inView={false}>
          {PERKS.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title}>
              <div className="flex gap-4 rounded-card border border-line bg-surface p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neon-dim text-neon">
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{text}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="space-y-4 self-start rounded-card border border-line-strong bg-surface p-5 shadow-panel sm:p-6"
      >
        <h2 className="font-display text-lg font-bold">Upload your first song</h2>
        <UploadAllowance className="border-line bg-black" />
        <Button href="/creator/upload" size="lg" fullWidth>
          <Upload size={18} aria-hidden /> Upload a song
        </Button>
        <p className="flex items-start gap-2 text-xs text-fg-subtle">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-neon" aria-hidden />
          Only upload music you own or have the rights to share. Community songs can be reported and
          taken down.
        </p>
      </motion.div>
    </div>
  );
}

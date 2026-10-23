"use client";

/**
 * "Become a Creator" (PRD CRT-1): pick a stage name, a short bio and your
 * genres. On success the session is refreshed so the new creator role is in
 * the access token, and the studio opens.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AudioLines, BarChart3, Mic2, UploadCloud } from "lucide-react";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import ChipPicker from "@/components/ui/ChipPicker";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { useAuthStore } from "@/store/authStore";
import { becomeCreator } from "@/services/creator.service";
import { QUERY_KEYS } from "@/utils/constants";
import { fadeUp } from "@/utils/animations";

const PERKS = [
  {
    icon: UploadCloud,
    title: "Upload your music",
    text: "MP3, WAV or FLAC — we create streaming versions for every connection.",
  },
  {
    icon: AudioLines,
    title: "Your artist page",
    text: "A public page with your tracks, albums and bio to share anywhere.",
  },
  {
    icon: BarChart3,
    title: "Reach listeners",
    text: "Your tracks join search, vibes and personalised recommendations.",
  },
];

export default function BecomeCreatorForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const refreshSession = useAuthStore((state) => state.refresh);
  const taxonomy = useTaxonomy("user");
  const [values, setValues] = useState({ stageName: user?.name ?? "", bio: "", genres: [] });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const stageName = values.stageName.trim();
    if (stageName.length < 2) {
      setErrors({ stageName: "Use at least 2 characters" });
      return;
    }

    setIsSaving(true);
    try {
      const result = await becomeCreator({
        stageName,
        bio: values.bio.trim(),
        genres: values.genres,
      });
      setUser(result.user);
      await refreshSession(); // new access token carries the creator role
      queryClient.setQueryData(QUERY_KEYS.myArtist, { artist: result.artist });
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? "Couldn't set up your creator profile. Try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <p className="mb-2 text-xs tracking-widest text-neon uppercase sm:text-sm">
          $ selfvibe creator --init
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-tight font-bold">
          Share your music with the world
        </h1>
        <p className="mt-3 max-w-xl text-fg-muted">
          Set up your artist profile in a minute. You can change everything later.
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

      <motion.form
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-card border border-line-strong bg-surface p-5 shadow-panel sm:p-6"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Mic2 size={18} className="text-neon" aria-hidden /> Your artist profile
        </h2>
        <FormAlert message={formError} />
        <TextField
          label="Stage name"
          icon={Mic2}
          value={values.stageName}
          maxLength={60}
          autoComplete="nickname"
          onChange={(event) => update("stageName", event.target.value)}
          error={errors.stageName}
        />
        <TextAreaField
          label="Bio (optional)"
          value={values.bio}
          maxLength={1000}
          rows={4}
          placeholder="Who you are, what you make, where you're from"
          onChange={(event) => update("bio", event.target.value)}
          error={errors.bio}
        />
        <ChipPicker
          label="Your genres (optional)"
          options={taxonomy.genres}
          value={values.genres}
          max={5}
          loading={taxonomy.isPending}
          onChange={(genres) => update("genres", genres)}
          error={errors.genres}
        />
        <Button type="submit" size="lg" fullWidth loading={isSaving}>
          {isSaving ? "Setting up…" : "Become a creator"}
        </Button>
        <p className="text-center text-xs text-fg-subtle">
          Only upload music you own or have the rights to share.
        </p>
      </motion.form>
    </div>
  );
}

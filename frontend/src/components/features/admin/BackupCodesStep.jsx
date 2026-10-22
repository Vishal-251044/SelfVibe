"use client";

/**
 * Shown once, right after 2FA is turned on: the 10 single-use backup codes.
 * The staff member must confirm they saved them before entering the console.
 */
import { useState } from "react";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * @param {Object} props
 * @param {string[]} props.codes
 * @param {() => void} props.onContinue
 */
export default function BackupCodesStep({ codes, onContinue }) {
  const [hasSaved, setHasSaved] = useState(false);
  const { copy, isCopied } = useCopyToClipboard();
  const codesText = codes.join("\n");

  /** Save the codes as a .txt file. */
  const handleDownload = () => {
    const text = `SelfVibe console backup codes\nEach code works once. Keep them somewhere safe.\n\n${codesText}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: "selfvibe-backup-codes.txt",
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 text-neon">
        <ShieldCheck size={22} aria-hidden />
        <p className="text-sm">Two-factor authentication is on</p>
      </div>
      <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Save your backup codes</h1>
      <p className="mt-2 text-sm text-fg-muted">
        If you lose your phone, each code lets you sign in once. They will not be shown again.
      </p>

      <Stagger className="mt-6 grid grid-cols-2 gap-2" stagger={0.03} inView={false}>
        {codes.map((code) => (
          <StaggerItem key={code}>
            <code className="block rounded-lg border border-line bg-black px-3 py-2.5 text-center text-sm tracking-wider text-neon-soft">
              {code}
            </code>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => copy(codesText)}>
          {isCopied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {isCopied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download size={16} aria-hidden />
          Download
        </Button>
      </div>

      <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg-muted">
        <input
          type="checkbox"
          checked={hasSaved}
          onChange={(event) => setHasSaved(event.target.checked)}
          className="size-5 accent-(--color-neon)"
        />
        I have saved these codes somewhere safe
      </label>

      <Button size="lg" fullWidth disabled={!hasSaved} onClick={onContinue} className="mt-4">
        Enter the console
      </Button>
    </div>
  );
}

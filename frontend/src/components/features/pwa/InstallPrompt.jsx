"use client";

/**
 * "Install SelfVibe" prompt (PRD PWA-2, roadmap Day 10).
 * - Android / desktop Chrome & Edge: a small card that opens the browser's
 *   install dialog
 * - iPhone / iPad: the same card opens a short "Add to Home Screen" guide
 *   (Safari has no install dialog)
 * Appears after the listener has spent a little time in the app, never while
 * already installed, and stays away for two weeks after "Not now".
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Plus, Share, Smartphone, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { useInstallStore } from "@/store/installStore";
import {
  isStandaloneApp,
  needsIosInstallGuide,
  rememberInstallDismissed,
  wasInstallDismissed,
} from "@/utils/pwa";
import { fadeUp } from "@/utils/animations";

const SHOW_AFTER_MS = 20_000;

/** Steps for adding SelfVibe to the iPhone home screen. */
export function IosInstallSteps() {
  const steps = [
    {
      icon: Share,
      text: (
        <>
          Tap <strong className="text-fg">Share</strong> in Safari&apos;s toolbar
        </>
      ),
    },
    {
      icon: Plus,
      text: (
        <>
          Choose <strong className="text-fg">Add to Home Screen</strong>
        </>
      ),
    },
    {
      icon: Smartphone,
      text: <>Open SelfVibe from its new icon: music keeps playing when the screen locks</>,
    },
  ];
  return (
    <ol className="space-y-3">
      {steps.map(({ icon: Icon, text }, index) => (
        <li key={index} className="flex items-start gap-3 text-sm text-fg-muted">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-neon-dim text-neon">
            <Icon size={18} aria-hidden />
          </span>
          <span className="pt-2">
            <span className="sr-only">Step {index + 1}: </span>
            {text}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function InstallPrompt() {
  const deferredPrompt = useInstallStore((state) => state.deferredPrompt);
  const isInstalled = useInstallStore((state) => state.isInstalled);
  const promptInstall = useInstallStore((state) => state.promptInstall);
  const [isDue, setIsDue] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);

  // Wait a little before offering anything; read the browser only on the client
  useEffect(() => {
    if (isStandaloneApp() || wasInstallDismissed()) return undefined;
    const timer = setTimeout(() => {
      setIsIos(needsIosInstallGuide());
      setIsDue(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const canOffer = Boolean(deferredPrompt) || isIos;
  const isVisible = isDue && !isClosed && !isInstalled && canOffer;

  const dismiss = () => {
    rememberInstallDismissed();
    setIsClosed(true);
  };
  const install = async () => {
    if (isIos && !deferredPrompt) {
      setIsGuideOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome !== "accepted") rememberInstallDismissed();
    setIsClosed(true);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.aside
            aria-label="Install SelfVibe"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+var(--player-height)+env(safe-area-inset-bottom)+0.75rem)] z-40 rounded-card border border-line-strong bg-black/90 p-4 shadow-panel backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-[calc(var(--player-height)+1.5rem)] md:w-96"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neon-dim text-neon">
                <Download size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Install SelfVibe</p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Opens like an app and keeps playing with the screen locked.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close install prompt"
                className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={dismiss}>
                Not now
              </Button>
              <Button onClick={install}>{isIos ? "Show me how" : "Install"}</Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Sheet
        open={isGuideOpen}
        onClose={() => {
          setIsGuideOpen(false);
          dismiss();
        }}
        title="Add SelfVibe to your Home Screen"
        description="Three taps in Safari."
      >
        <IosInstallSteps />
      </Sheet>
    </>
  );
}

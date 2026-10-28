"use client";

/**
 * "App & privacy" on the profile page (roadmap Day 10):
 * - Install the app (PRD PWA-2): the browser's install dialog, or the iPhone
 *   "Add to Home Screen" guide
 * - Download my data (PRD §14 Privacy): one JSON file with everything stored
 * - Delete my account: confirmed with the password (or "DELETE" for accounts
 *   that only use Google sign-in); signs out everywhere afterwards
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileDown, Smartphone, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Sheet from "@/components/ui/Sheet";
import TextField from "@/components/ui/TextField";
import { IosInstallSteps } from "@/components/features/pwa/InstallPrompt";
import { deleteMyAccount, downloadMyData } from "@/services/user.service";
import { useInstallStore } from "@/store/installStore";
import { usePlayerStore } from "@/store/playerStore";
import { showToast } from "@/store/toastStore";
import { needsIosInstallGuide } from "@/utils/pwa";

/**
 * One row: icon, text and an action on the right (stacks on small phones).
 * @param {{ icon: React.ComponentType, title: string, description: string, children: React.ReactNode }} props
 */
function Row({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neon-dim text-neon">
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="text-sm text-fg-muted">{description}</p>
        </div>
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

/** Install row: shows what this browser supports. */
function InstallRow() {
  const deferredPrompt = useInstallStore((state) => state.deferredPrompt);
  const isInstalled = useInstallStore((state) => state.isInstalled);
  const promptInstall = useInstallStore((state) => state.promptInstall);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  // Read on click, not during render, so server and client render the same
  const install = () => (deferredPrompt ? promptInstall() : setIsGuideOpen(true));

  return (
    <Row
      icon={Smartphone}
      title="Install the app"
      description="Home-screen icon, full screen, and music that keeps playing when the phone locks."
    >
      {isInstalled ? (
        <p className="inline-flex min-h-11 items-center gap-2 text-sm text-neon">
          <CheckCircle2 size={16} aria-hidden /> Installed
        </p>
      ) : (
        <Button variant="outline" onClick={install}>
          <Download size={16} aria-hidden /> Install
        </Button>
      )}
      <Sheet
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Install SelfVibe"
        description={
          needsIosInstallGuide()
            ? "Three taps in Safari."
            : "Use your browser's menu: Install app, or Add to Home screen."
        }
      >
        <IosInstallSteps />
      </Sheet>
    </Row>
  );
}

export default function AccountPrivacy() {
  const queryClient = useQueryClient();
  const clearPlayer = usePlayerStore((state) => state.clear);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteState, setDeleteState] = useState({ loading: false, error: null });

  const exportData = async () => {
    setIsExporting(true);
    try {
      await downloadMyData();
      showToast({
        message: "your data is downloading",
        tone: "success",
      });
    } catch (error) {
      showToast({
        message: error?.message ?? "couldn't prepare your data, try again",
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const closeDelete = () => {
    if (deleteState.loading) return;
    setIsDeleteOpen(false);
    setConfirmation("");
    setDeleteState({ loading: false, error: null });
  };

  const deleteAccount = async () => {
    setDeleteState({ loading: true, error: null });
    try {
      await deleteMyAccount(confirmation);
      clearPlayer();
      queryClient.clear();
      // Full page load to the landing page: the API already cleared the session
      // cookies, and clearing the store first would let the route guard send us to /login
      window.location.replace("/");
    } catch (error) {
      setDeleteState({
        loading: false,
        error: error?.message ?? "Couldn't delete your account. Try again.",
      });
    }
  };

  return (
    <section
      aria-labelledby="account-privacy-title"
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="account-privacy-title" className="mb-4 font-semibold text-neon-soft">
        App &amp; privacy
      </h2>
      <div className="divide-y divide-line">
        <InstallRow />
        <Row
          icon={FileDown}
          title="Download my data"
          description="Your profile, likes, playlists, comments and listening history as a file."
        >
          <Button variant="outline" onClick={exportData} loading={isExporting}>
            {!isExporting && <Download size={16} aria-hidden />} Download
          </Button>
        </Row>
        <Row
          icon={Trash2}
          title="Delete my account"
          description="Removes your account, playlists, likes and history for good."
        >
          <Button
            variant="ghost"
            onClick={() => setIsDeleteOpen(true)}
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            Delete account
          </Button>
        </Row>
      </div>

      <Sheet
        open={isDeleteOpen}
        onClose={closeDelete}
        dismissible={!deleteState.loading}
        title="Delete your account?"
        description="This can't be undone. Songs you uploaded are removed too."
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={closeDelete} disabled={deleteState.loading}>
              Keep account
            </Button>
            <Button
              onClick={deleteAccount}
              loading={deleteState.loading}
              disabled={!confirmation}
              className="bg-danger text-black hover:bg-danger/90"
            >
              Delete for good
            </Button>
          </div>
        }
      >
        <FormAlert message={deleteState.error} className="mb-3" />
        <TextField
          label="Your password"
          type="password"
          autoComplete="current-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-describedby="delete-account-hint"
        />
        <p id="delete-account-hint" className="mt-2 text-xs text-fg-subtle">
          Signed up with Google only? Type DELETE instead.
        </p>
      </Sheet>
    </section>
  );
}

"use client";

/**
 * Console sign-in flow (PRD §11.6): password → 2FA (first time: enrol the
 * authenticator, then save backup codes) → console.
 */
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import StaffCredentialsStep from "@/components/features/admin/StaffCredentialsStep";
import TwoFactorSetupStep from "@/components/features/admin/TwoFactorSetupStep";
import TwoFactorCodeForm from "@/components/features/admin/TwoFactorCodeForm";
import BackupCodesStep from "@/components/features/admin/BackupCodesStep";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import { fadeUp } from "@/utils/animations";

const NOTICES = {
  idle: "You were signed out after 30 minutes of inactivity.",
  expired: "Your console session ended. Please sign in again.",
  signedout: "You have signed out of the console.",
  challenge: "That sign-in step expired. Please enter your password again.",
};

export default function AdminLoginFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useStaffAuthStore((state) => state.setSession);

  const [step, setStep] = useState("credentials"); // credentials | setup | verify | backupCodes
  const [challengeToken, setChallengeToken] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [notice, setNotice] = useState(NOTICES[searchParams.get("reason")] ?? null);

  /** Password accepted: go to enrolment or code entry. */
  const handleCredentials = ({ step: nextStep, challengeToken: token }) => {
    setNotice(null);
    setChallengeToken(token);
    setStep(nextStep);
  };

  /** The 5-minute challenge ran out: start again from the password. */
  const handleExpired = useCallback(() => {
    setChallengeToken(null);
    setNotice(NOTICES.challenge);
    setStep("credentials");
  }, []);

  /** Code accepted: store the session, show backup codes on first login. */
  const handleVerified = ({ staff, accessToken, backupCodes: newCodes }) => {
    setSession(staff, accessToken);
    if (newCodes?.length) {
      setBackupCodes(newCodes);
      setStep("backupCodes");
    } else {
      router.replace("/admin");
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
        {step === "credentials" && (
          <StaffCredentialsStep onSuccess={handleCredentials} notice={notice} />
        )}

        {step === "setup" && (
          <TwoFactorSetupStep
            challengeToken={challengeToken}
            onSuccess={handleVerified}
            onExpired={handleExpired}
          />
        )}

        {step === "verify" && (
          <div>
            <p className="font-mono text-sm text-neon">$ selfvibe console --verify</p>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Two-factor check</h1>
            <p className="mt-2 mb-6 text-sm text-fg-muted">
              Enter the 6-digit code from your authenticator app.
            </p>
            <TwoFactorCodeForm
              challengeToken={challengeToken}
              onSuccess={handleVerified}
              onExpired={handleExpired}
              allowBackupCode
            />
          </div>
        )}

        {step === "backupCodes" && (
          <BackupCodesStep codes={backupCodes} onContinue={() => router.replace("/admin")} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

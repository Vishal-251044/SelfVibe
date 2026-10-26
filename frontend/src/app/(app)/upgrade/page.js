/**
 * Upgrade (/upgrade, PRD §10.10): choose Premium or Creator Pro and pay with Razorpay.
 */
import { Suspense } from "react";
import UpgradeView from "@/components/features/billing/UpgradeView";
import Skeleton from "@/components/ui/Skeleton";

export const metadata = { title: "Upgrade" };

export default function UpgradePage() {
  return (
    // useSearchParams (?plan=) needs a Suspense boundary
    <Suspense fallback={<Skeleton className="h-80 rounded-card" />}>
      <UpgradeView />
    </Suspense>
  );
}

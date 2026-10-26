/**
 * Console → Subscriptions (/admin/subscriptions, PRD §10.10): Admin and Owner.
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import SubscriptionsManager from "@/components/features/admin/billing/SubscriptionsManager";

export const metadata = { title: "Subscriptions" };

export default function AdminSubscriptionsPage() {
  return (
    <RequirePermission permission="billing.view">
      <SubscriptionsManager />
    </RequirePermission>
  );
}

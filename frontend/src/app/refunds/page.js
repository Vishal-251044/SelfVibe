/**
 * Refund & Cancellation Policy (/refunds, PRD §10.10). Razorpay asks every
 * merchant for one before going live. Plain-language draft; have it reviewed.
 */
import LegalPage from "@/components/features/legal/LegalPage";

export const metadata = {
  title: "Refund & Cancellation Policy",
  description: "How SelfVibe subscriptions renew, how to cancel, and when refunds are given.",
};

const SECTIONS = [
  {
    heading: "Subscriptions",
    body: [
      "Premium and Creator Pro are paid monthly or yearly through Razorpay (UPI AutoPay, cards or netbanking). Your plan renews automatically at the end of each period until you cancel.",
      "Prices are shown before you pay and include applicable taxes. If a price changes, the new price applies only after we tell you and only from your next renewal.",
    ],
  },
  {
    heading: "Cancelling",
    body: [
      "Cancel any time from Profile → Plan & billing → Cancel plan. You keep your paid plan until the end of the period you already paid for, and you won't be charged again.",
      "You can also stop the UPI AutoPay mandate from your UPI app; your plan then ends at the end of the paid period.",
    ],
  },
  {
    heading: "Refunds",
    body: [
      "Payments for a period that has started are not refunded, because you keep full access until it ends.",
      "If you were charged by mistake (for example twice for the same period, or after cancelling), write to support@selfvibe.ai within 7 days with the payment date. Approved refunds go back to the original payment method within 5–7 working days.",
    ],
  },
  {
    heading: "Failed payments",
    body: [
      "If a renewal fails, Razorpay tries again over the next few days and we let you know by email. If it still fails, your account moves to the Free plan; your playlists, likes and uploads stay.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Billing questions: support@selfvibe.ai. Please include the email address of your SelfVibe account.",
    ],
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      command="selfvibe billing --policy"
      title="Refund & Cancellation Policy"
      updated="1 November 2026"
      sections={SECTIONS}
    />
  );
}

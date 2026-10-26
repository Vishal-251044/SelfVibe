/**
 * Razorpay Checkout for subscriptions (PRD §10.10): loads Razorpay's script
 * only when someone upgrades, opens the payment window (UPI, cards,
 * netbanking), and hands the result to our API, which checks Razorpay's
 * signature before the plan changes. Nothing here is trusted on its own.
 */
import { useCallback, useState } from "react";
import { confirmCheckout, startCheckout } from "@/services/billing.service";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise = null;

/**
 * Load Razorpay's Checkout script once.
 * @returns {Promise<void>}
 */
function loadCheckoutScript() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * @returns {{ checkout: (choice: { plan: string, period: string }) => Promise<Object|null>, status: "idle"|"starting"|"paying"|"confirming", error: string|null, reset: () => void }}
 *   checkout resolves with the new billing summary, or null if the person closed the window
 */
export function useRazorpayCheckout() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const checkout = useCallback(async (choice) => {
    setError(null);
    setStatus("starting");
    try {
      const [order] = await Promise.all([startCheckout(choice), loadCheckoutScript()]);
      setStatus("paying");
      const result = await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.keyId,
          subscription_id: order.subscriptionId,
          name: "SelfVibe",
          description: `${order.planLabel} · ${choice.period === "yearly" ? "yearly" : "monthly"}`,
          prefill: order.prefill,
          theme: { color: "#22c55e", backdrop_color: "#000000" },
          modal: { ondismiss: () => resolve(null), confirm_close: true },
          handler: (response) => resolve(response),
        });
        razorpay.on("payment.failed", (event) =>
          reject(new Error(event?.error?.description ?? "The payment didn't go through."))
        );
        razorpay.open();
      });
      if (!result) {
        setStatus("idle");
        return null;
      }
      setStatus("confirming");
      const billing = await confirmCheckout({
        paymentId: result.razorpay_payment_id,
        subscriptionId: result.razorpay_subscription_id,
        signature: result.razorpay_signature,
      });
      setStatus("idle");
      return billing;
    } catch (checkoutError) {
      setError(checkoutError?.message ?? "Something went wrong with the payment.");
      setStatus("idle");
      return null;
    }
  }, []);

  return { checkout, status, error, reset: () => setError(null) };
}

/**
 * Signature neon grid background with a soft radial glow and a fade-out mask.
 * Place inside a `relative isolate` parent; it fills the parent and sits behind
 * content (`isolate` keeps the -z-10 layer inside the parent's stacking context).
 */
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {number} [props.intensity=0.22] - Grid line opacity (0–1)
 * @param {boolean} [props.glow=true] - Add the green radial glow
 * @param {string} [props.className]
 */
export default function GridBackground({ intensity = 0.22, glow = true, className }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      <div
        className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        style={{ "--grid-alpha": intensity }}
      />
      {glow && (
        <div className="absolute top-0 left-1/2 h-[28rem] w-[min(48rem,100%)] -translate-x-1/2 rounded-full bg-neon/15 blur-3xl" />
      )}
    </div>
  );
}

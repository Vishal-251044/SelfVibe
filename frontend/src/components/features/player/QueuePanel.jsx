"use client";

/**
 * The play queue (PRD PLY-3): now playing, then "Next up" — drag the handle
 * to reorder, or use the move buttons; remove songs; tap a song to play it.
 * Shown in a sheet (bottom sheet on phones, dialog on larger screens).
 */
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, ListMusic, Trash2, X } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CoverArt from "@/components/features/music/CoverArt";
import { usePlayerStore } from "@/store/playerStore";
import { cn, formatDuration } from "@/utils/genericFunctions";

/**
 * One upcoming song with its drag handle and actions.
 * @param {{ item: Object, position: number, total: number, onMove: (from: number, to: number) => void }} props
 */
function QueueRow({ item, position, total, onMove }) {
  const dragControls = useDragControls();
  const jumpTo = usePlayerStore((state) => state.jumpTo);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon disabled:opacity-30";

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-1 rounded-control bg-surface pr-1 select-none"
    >
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label={`Drag to reorder ${item.title}`}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-fg-subtle active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <button
        type="button"
        onClick={() => jumpTo(item.qid)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left"
      >
        <CoverArt src={item.coverUrl} alt="" className="size-10 rounded-md" sizes="40px" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-fg">{item.title}</span>
          <span className="block truncate text-xs text-fg-subtle">
            {item.artist?.stageName} · {formatDuration(item.durationSec)}
          </span>
        </span>
      </button>
      <span className="hidden sm:flex">
        <button
          type="button"
          aria-label={`Move ${item.title} up`}
          disabled={position === 0}
          onClick={() => onMove(position, position - 1)}
          className={iconButton}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Move ${item.title} down`}
          disabled={position === total - 1}
          onClick={() => onMove(position, position + 1)}
          className={iconButton}
        >
          <ArrowDown size={16} />
        </button>
      </span>
      <button
        type="button"
        aria-label={`Remove ${item.title} from queue`}
        onClick={() => removeFromQueue(item.qid)}
        className={cn(iconButton, "hover:bg-danger/10 hover:text-danger")}
      >
        <X size={16} />
      </button>
    </Reorder.Item>
  );
}

export default function QueuePanel() {
  const isOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.index);
  const reorderUpcoming = usePlayerStore((state) => state.reorderUpcoming);
  const clear = usePlayerStore((state) => state.clear);

  const current = queue[index];
  const upcoming = queue.slice(index + 1);

  /** Move an upcoming song with the arrow buttons. */
  const move = (from, to) => {
    const reordered = [...upcoming];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    reorderUpcoming(reordered);
  };

  return (
    <Sheet
      open={isOpen}
      onClose={() => setQueueOpen(false)}
      title="Queue"
      description={upcoming.length ? `${upcoming.length} up next` : undefined}
      className="sm:max-w-xl"
      footer={
        queue.length > 0 && (
          <Button
            variant="ghost"
            fullWidth
            onClick={clear}
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={16} aria-hidden /> Clear queue
          </Button>
        )
      }
    >
      {current && (
        <section aria-labelledby="queue-now-heading" className="mb-5">
          <h3 id="queue-now-heading" className="mb-2 text-xs tracking-widest text-neon uppercase">
            Now playing
          </h3>
          <div className="flex items-center gap-3 rounded-control border border-line-strong bg-neon-dim p-2">
            <CoverArt src={current.coverUrl} alt="" className="size-12 rounded-md" sizes="48px" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-fg">{current.title}</span>
              <span className="block truncate text-xs text-fg-muted">
                {current.artist?.stageName}
              </span>
            </span>
          </div>
        </section>
      )}

      <section aria-labelledby="queue-next-heading">
        <h3
          id="queue-next-heading"
          className="mb-2 text-xs tracking-widest text-fg-subtle uppercase"
        >
          Next up
        </h3>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center rounded-control border border-dashed border-line px-4 py-8 text-center">
            <ListMusic size={24} className="text-neon" aria-hidden />
            <p className="mt-3 text-sm text-fg-muted">
              Nothing queued. Use &ldquo;Add to queue&rdquo; on any song.
            </p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={upcoming}
            onReorder={reorderUpcoming}
            className="space-y-1"
          >
            {upcoming.map((item, position) => (
              <QueueRow
                key={item.qid}
                item={item}
                position={position}
                total={upcoming.length}
                onMove={move}
              />
            ))}
          </Reorder.Group>
        )}
      </section>
    </Sheet>
  );
}

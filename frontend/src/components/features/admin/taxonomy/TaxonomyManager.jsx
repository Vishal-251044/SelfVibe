"use client";

/**
 * Admin Console → Genres & Vibes (/admin/genres, roadmap Day 7): add,
 * rename, reorder (drag, or the arrow buttons), icon and colour, show / hide,
 * and delete unused ones. Browse, Search and the taste quiz read this list.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  Shapes,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import TaxonomyFormSheet from "@/components/features/admin/taxonomy/TaxonomyFormSheet";
import {
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from "@/services/adminTaxonomy.service";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, pluralize } from "@/utils/genericFunctions";

const TABS = [
  { kind: "genre", label: "Genres" },
  { kind: "vibe", label: "Vibes" },
];

/**
 * One draggable row.
 * @param {Object} props
 * @param {Object} props.item
 * @param {number} props.index
 * @param {number} props.count
 * @param {(from: number, to: number) => void} props.onMove
 * @param {() => void} props.onDragEnd
 * @param {() => void} props.onEdit
 * @param {() => void} props.onToggle
 * @param {() => void} props.onDelete
 */
function CategoryRow({ item, index, count, onMove, onDragEnd, onEdit, onToggle, onDelete }) {
  const dragControls = useDragControls();
  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2 rounded-control border border-line bg-surface p-2 sm:gap-3",
        !item.active && "opacity-60"
      )}
    >
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label={`Drag to reorder ${item.name}`}
        className="hidden size-11 shrink-0 cursor-grab touch-none items-center justify-center text-fg-subtle active:cursor-grabbing sm:flex"
      >
        <GripVertical size={18} aria-hidden />
      </button>
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${item.colour}26`, color: item.colour }}
      >
        <TaxonomyIcon name={item.icon} size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-fg">{item.name}</span>
          {!item.active && <Badge tone="muted">Hidden</Badge>}
        </span>
        <span className="block truncate font-mono text-xs text-fg-subtle">
          {item.slug} · {pluralize(item.trackCount, "song")}
        </span>
      </span>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className={iconButton}
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${item.name} up`}
        >
          <ArrowUp size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={iconButton}
          onClick={() => onMove(index, index + 1)}
          disabled={index === count - 1}
          aria-label={`Move ${item.name} down`}
        >
          <ArrowDown size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={cn(iconButton, "hidden sm:flex")}
          onClick={onToggle}
          aria-label={item.active ? `Hide ${item.name}` : `Show ${item.name}`}
        >
          {item.active ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
        </button>
        <button
          type="button"
          className={iconButton}
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
        >
          <Pencil size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={cn(iconButton, "hover:text-danger")}
          onClick={onDelete}
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </Reorder.Item>
  );
}

export default function TaxonomyManager() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState("genre");
  const [order, setOrder] = useState(null); // local order while dragging
  const [editing, setEditing] = useState(null); // item, or "new"
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState(null);
  const queryKey = QUERY_KEYS.adminCategories(kind);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => listCategories(kind, { signal }),
  });
  const items = order ?? query.data?.items ?? [];

  /** Listener-facing lists use this taxonomy too. */
  const refreshEverywhere = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["browse"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminTaxonomy });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onboardingOptions });
  };

  const saveOrder = useMutation({
    mutationFn: (ids) => reorderCategories(kind, ids),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setOrder(null);
      refreshEverywhere();
    },
    onError: (error) => {
      setOrder(null); // back to the saved order
      setActionError(error?.message ?? "Couldn't save the order.");
    },
  });

  const toggle = useMutation({
    mutationFn: (item) => updateCategory(kind, item.id, { active: !item.active }),
    onSuccess: refreshEverywhere,
    onError: (error) => setActionError(error?.message ?? "Couldn't update it."),
  });

  const remove = useMutation({
    mutationFn: (item) => deleteCategory(kind, item.id),
    onSuccess: () => {
      setDeleting(null);
      refreshEverywhere();
    },
  });

  /** Arrow buttons: move one row and save. */
  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    saveOrder.mutate(next.map((item) => item.id));
  };

  const switchTab = (nextKind) => {
    setKind(nextKind);
    setOrder(null);
    setActionError(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="selfvibe admin --taxonomy"
        title="Genres & Vibes"
        subtitle="What listeners browse by. Order here is the order in the app."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden /> Add {kind}
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Genres or vibes"
        className="mb-6 inline-flex rounded-full border border-line bg-surface p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            role="tab"
            aria-selected={kind === tab.kind}
            onClick={() => switchTab(tab.kind)}
            className={cn(
              "min-h-10 rounded-full px-5 text-sm font-medium transition",
              kind === tab.kind ? "bg-neon text-black" : "text-fg-muted hover:text-fg"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FormAlert message={actionError} className="mb-4" />

      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={Shapes}
          command={`selfvibe admin --${kind}s`}
          title={`couldn't load ${kind}s`}
          description={query.error?.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Shapes}
          command={`selfvibe admin --${kind}s`}
          title={`no ${kind}s yet`}
          action={<Button onClick={() => setEditing("new")}>Add the first one</Button>}
        />
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={setOrder} className="space-y-2">
          {items.map((item, index) => (
            <CategoryRow
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              onMove={move}
              onDragEnd={() => order && saveOrder.mutate(order.map((entry) => entry.id))}
              onEdit={() => setEditing(item)}
              onToggle={() => toggle.mutate(item)}
              onDelete={() => {
                remove.reset();
                setDeleting(item);
              }}
            />
          ))}
        </Reorder.Group>
      )}

      {editing && (
        <TaxonomyFormSheet
          key={editing === "new" ? `new-${kind}` : editing.id}
          open
          kind={kind}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshEverywhere();
          }}
        />
      )}

      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description={
          deleting?.trackCount
            ? `${pluralize(deleting.trackCount, "song")} use it, so it can't be deleted — hide it instead.`
            : "This can't be undone."
        }
        loading={remove.isPending}
        error={remove.error?.message ?? null}
      />
    </>
  );
}

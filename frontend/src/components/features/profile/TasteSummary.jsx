"use client";

/**
 * "Your taste" card on the profile: the genres, vibes and artists from the
 * taste profile, strongest first, with a link to retake the quiz.
 */
import { useQuery } from "@tanstack/react-query";
import { Compass, RotateCw, SlidersHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getTaste } from "@/services/user.service";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {{ slug: string, name: string, icon: string, colour: string }[]} props.items
 */
function ChipRow({ title, items }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs tracking-widest text-fg-subtle uppercase">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          return (
            <li
              key={item.slug ?? item.id}
              style={{ "--chip": item.colour ?? "var(--color-neon)" }}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-black px-3 text-sm"
            >
              {item.icon && (
                <TaxonomyIcon name={item.icon} size={14} className="text-(--chip)" aria-hidden />
              )}
              {item.name ?? item.stageName}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function TasteSummary() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.taste,
    queryFn: ({ signal }) => getTaste({ signal }),
  });
  const taste = data?.taste;

  return (
    <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <SlidersHorizontal size={18} className="text-neon" aria-hidden />
          Your taste
        </h2>
        {taste && (
          <Button href="/onboarding?next=%2Fprofile" variant="ghost">
            <RotateCw size={16} aria-hidden />
            Retake quiz
          </Button>
        )}
      </div>

      {isPending && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            {["w-20", "w-28", "w-24"].map((width) => (
              <Skeleton key={width} className={`h-9 rounded-full ${width}`} />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-3 text-sm text-fg-muted">
          <span>Couldn&apos;t load your taste.</span>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isPending && !isError && !taste && (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm text-fg-muted">
            <Compass size={20} className="shrink-0 text-neon" aria-hidden />
            You skipped the taste quiz. Take it to get a feed made for you.
          </p>
          <Button href="/onboarding?next=%2Fprofile">Take the quiz</Button>
        </div>
      )}

      {taste && (
        <div className="space-y-5">
          <ChipRow title="Genres" items={taste.genres} />
          <ChipRow title="Vibes" items={taste.vibes} />
          <ChipRow title="Artists" items={taste.artists} />
        </div>
      )}
    </section>
  );
}

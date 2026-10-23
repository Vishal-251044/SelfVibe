"use client";

/**
 * Previous / next pager with "Page 2 of 7" in the middle.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

/**
 * @param {Object} props
 * @param {{ page: number, totalPages: number, total: number }} props.meta - From the API
 * @param {(page: number) => void} props.onPageChange
 * @param {boolean} [props.disabled=false]
 */
export default function Pagination({ meta, onPageChange, disabled = false }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <Button
        variant="outline"
        disabled={disabled || meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={18} aria-hidden />
        <span className="hidden sm:inline">Previous</span>
      </Button>
      <p className="text-sm text-fg-muted">
        Page <span className="text-fg">{meta.page}</span> of {meta.totalPages}
      </p>
      <Button
        variant="outline"
        disabled={disabled || meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={18} aria-hidden />
      </Button>
    </nav>
  );
}

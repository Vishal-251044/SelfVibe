/**
 * The Official · Community · All switch (PRD CAT-2, roadmap Day 7),
 * remembered per user: saved on the account, so it follows them to every
 * device. Changes show at once and roll back if saving fails.
 */
import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { updateMe } from "@/services/user.service";
import { CATALOG_FILTERS } from "@/utils/musicConstants";

const VALID = new Set(CATALOG_FILTERS.map((option) => option.value));

/**
 * @returns {{ catalog: "all"|"official"|"community", setCatalog: (value: string) => void }}
 */
export function useCatalogFilter() {
  const stored = useAuthStore((state) => state.user?.catalogFilter);
  const catalog = VALID.has(stored) ? stored : "all";

  const setCatalog = useCallback((value) => {
    const { user, setUser } = useAuthStore.getState();
    if (!user || !VALID.has(value) || user.catalogFilter === value) return;
    const previous = user.catalogFilter ?? "all";
    setUser({ ...user, catalogFilter: value });
    updateMe({ catalogFilter: value }).catch(() => {
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.getState().setUser({ ...current, catalogFilter: previous });
    });
  }, []);

  return { catalog, setCatalog };
}

/**
 * Read the switch outside React (voice commands).
 * @returns {"all"|"official"|"community"}
 */
export function getCatalogFilter() {
  const stored = useAuthStore.getState().user?.catalogFilter;
  return VALID.has(stored) ? stored : "all";
}

"use client";

/**
 * Shows its children only when the signed-in staff member has a permission;
 * otherwise a "no access" state (the API enforces the same rule).
 */
import { Lock } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { useStaffAuthStore } from "@/store/staffAuthStore";

/**
 * Whether the signed-in staff member has a permission.
 * @param {string} permission - e.g. "music.manage"
 * @returns {boolean}
 */
export function useHasPermission(permission) {
  return useStaffAuthStore((state) => Boolean(state.staff?.permissions?.includes(permission)));
}

/**
 * @param {Object} props
 * @param {string} props.permission
 * @param {React.ReactNode} props.children
 */
export default function RequirePermission({ permission, children }) {
  const isAllowed = useHasPermission(permission);
  if (isAllowed) return children;
  return (
    <EmptyState
      icon={Lock}
      title="you don't have access to this"
      description="Ask the Owner to change your role if you need it."
      action={<Button href="/admin">Back to dashboard</Button>}
    />
  );
}

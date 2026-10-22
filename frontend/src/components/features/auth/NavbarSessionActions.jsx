"use client";

/**
 * Right side of the public navbar, based on the session:
 * - signed in: avatar + "Open app"
 * - signed out: "Log in" + "Get Started"
 * - while checking: a skeleton of the same size (no layout jump)
 */
import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {"desktop"|"mobile"} [props.variant="desktop"]
 * @param {Function} [props.onNavigate] - Called when a link is used (closes the mobile menu)
 */
export default function NavbarSessionActions({ variant = "desktop", onNavigate }) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isMobile = variant === "mobile";

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === "idle" || status === "loading") {
    return <Skeleton className={cn("h-11 rounded-control", isMobile ? "w-full" : "w-56")} />;
  }

  if (status === "authenticated" && user) {
    return (
      <div className={cn("flex items-center gap-3", isMobile && "justify-between")}>
        <Link
          href="/profile"
          onClick={onNavigate}
          aria-label="Your profile"
          className="flex min-h-11 items-center gap-3 rounded-full pr-2"
        >
          <Avatar name={user.name} src={user.avatar} size="sm" />
          {isMobile && <span className="truncate text-sm text-fg">{user.name}</span>}
        </Link>
        <Button href="/home" onClick={onNavigate}>
          Open app
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(isMobile ? "grid grid-cols-2 gap-3" : "flex items-center gap-2")}>
      <Button href="/login" variant={isMobile ? "outline" : "ghost"} onClick={onNavigate}>
        Log in
      </Button>
      <Button href="/signup" onClick={onNavigate}>
        Get Started
      </Button>
    </div>
  );
}

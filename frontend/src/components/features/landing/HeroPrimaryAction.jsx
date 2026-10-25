"use client";

/**
 * Hero's main button (roadmap Day 10 "landing page links to the real app"):
 * "Start listening free" for visitors, "Open SelfVibe" for people who are
 * already signed in (read from the session hint, no network call).
 */
import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { SESSION_HINT_COOKIES } from "@/utils/constants";
import { hasCookie } from "@/utils/genericFunctions";

const subscribe = () => () => {};

export default function HeroPrimaryAction() {
  // false on the server and during hydration, the real value right after
  const isSignedIn = useSyncExternalStore(
    subscribe,
    () => hasCookie(SESSION_HINT_COOKIES.user),
    () => false
  );
  return (
    <Button href={isSignedIn ? "/home" : "/signup"} size="lg">
      {isSignedIn ? "Open SelfVibe" : "Start listening free"}
      <ArrowRight size={18} aria-hidden />
    </Button>
  );
}

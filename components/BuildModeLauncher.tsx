"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { setBuildModeActive } from "@/lib/buildmode-state";

// The heavy game (three.js + engine) is only fetched when first rendered,
// i.e. when the user actually opens Build Mode — keeps the normal site light.
const BuildMode = dynamic(
  () => import("@/components/buildmode/BuildMode").then((m) => m.BuildMode),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-30 grid place-items-center bg-cream text-gray-soft">
        <p className="animate-pulse text-sm uppercase tracking-[0.3em]">Loading world…</p>
      </div>
    ),
  }
);

const NUDGE_DELAY_MS = 6000; // time on the page before suggesting the game
const NUDGE_VISIBLE_MS = 12000; // the suggestion hides itself after this long
const NUDGE_SEEN_KEY = "buildmode-nudge-seen"; // once per visit (sessionStorage)

function markNudgeSeen() {
  try {
    sessionStorage.setItem(NUDGE_SEEN_KEY, "1");
  } catch {
    /* storage blocked: the nudge may show again next load, which is harmless */
  }
}

export function BuildModeLauncher() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    // desktop only (needs keyboard + mouse + pointer lock)
    setCanPlay(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    setBuildModeActive(open);
    if (open) {
      // they found the game — no need to suggest it
      setNudge(false);
      markNudgeSeen();
    }
    return () => setBuildModeActive(false);
  }, [open]);

  // after a few seconds on the page, suggest the game once per visit
  useEffect(() => {
    if (!canPlay || open) return;
    try {
      if (sessionStorage.getItem(NUDGE_SEEN_KEY)) return;
    } catch {
      /* storage blocked: still suggest it */
    }
    const show = setTimeout(() => {
      setNudge(true);
      markNudgeSeen();
    }, NUDGE_DELAY_MS);
    return () => clearTimeout(show);
  }, [canPlay, open]);

  useEffect(() => {
    if (!nudge) return;
    const hide = setTimeout(() => setNudge(false), NUDGE_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [nudge]);

  useEffect(() => {
    if (!canPlay) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
      if (!open && !typing && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canPlay]);

  if (!canPlay) return null;

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 };

  return (
    <>
      <AnimatePresence>
        {nudge && !open && (
          <motion.div
            role="status"
            initial={hidden}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={hidden}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-16 left-4 z-30 w-[17rem] rounded-2xl bg-cream/95 p-4 shadow-[0_8px_32px_rgba(34,34,34,0.12)] backdrop-blur-md"
          >
            <p className="text-sm text-charcoal">Psst — there’s a game on this page.</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-soft">
              Walk around and build your own block world. Press{" "}
              <kbd className="rounded border border-charcoal/20 px-1 text-[10px] text-charcoal/80">B</kbd>{" "}
              anytime.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-full bg-charcoal px-3.5 py-1.5 text-xs uppercase tracking-[0.14em] text-cream transition-colors hover:bg-graphite"
              >
                Play now
              </button>
              <button
                type="button"
                onClick={() => setNudge(false)}
                className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-gray-soft transition-colors hover:text-charcoal"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Enter Build Mode"
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-charcoal/25 bg-cream/80 px-4 py-2 text-xs uppercase tracking-[0.18em] text-charcoal/80 shadow-[0_1px_16px_rgba(34,34,34,0.06)] backdrop-blur-md transition-colors hover:border-charcoal hover:text-charcoal"
        >
          <span aria-hidden className="text-[10px]">▶</span>
          Build mode
          <span aria-hidden className="ml-1 rounded border border-charcoal/20 px-1 text-[10px] leading-tight text-gray-soft">
            B
          </span>
        </button>
      )}
      {open && <BuildMode onExit={() => setOpen(false)} />}
    </>
  );
}

export default BuildModeLauncher;

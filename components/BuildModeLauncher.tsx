"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

export function BuildModeLauncher() {
  const [open, setOpen] = useState(false);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    // desktop only (needs keyboard + mouse + pointer lock)
    setCanPlay(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    setBuildModeActive(open);
    return () => setBuildModeActive(false);
  }, [open]);

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

  return (
    <>
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

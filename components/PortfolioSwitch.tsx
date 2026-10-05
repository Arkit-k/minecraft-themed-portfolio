"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { setRevealed, useRevealed } from "@/lib/reveal-state";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Two versions of the site, never both at once: the one-screen landing, and the
 * full portfolio. Only the Show more button (or a deep link) swaps them.
 */
export function PortfolioSwitch({ landing, full }: { landing: ReactNode; full: ReactNode }) {
  const reduce = useReducedMotion();
  const open = useRevealed();

  // a deep link (/#projects) should land on the full version
  useEffect(() => {
    const openOnHash = () => {
      if (window.location.hash.length > 1) setRevealed(true);
    };
    openOnHash();
    window.addEventListener("hashchange", openOnHash);
    return () => window.removeEventListener("hashchange", openOnHash);
  }, []);

  // start each version from the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [open]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.div
          key="full"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {full}
          {/* back to the one-screen version */}
          <div className="flex justify-center px-6 pb-16">
            <button
              type="button"
              onClick={() => setRevealed(false)}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-cream/85 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-charcoal/80 transition-colors hover:border-charcoal hover:text-charcoal"
            >
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.6} />
              Show less
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="landing"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {landing}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PortfolioSwitch;

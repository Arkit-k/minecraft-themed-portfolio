"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InkSwinger } from "@/components/InkSwinger";

const EASE = [0.16, 1, 0.3, 1] as const;
const MIN_MS = 650; // never flash by too quickly
const MAX_MS = 2600; // never hold a visitor hostage

/** A cream screen with the inked figure hanging from its line, until the page is ready. */
export function LoadingScreen() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const started = performance.now();
    const finish = () => {
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      window.setTimeout(() => setDone(true), wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const bail = window.setTimeout(() => setDone(true), MAX_MS);
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(bail);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loading"
          className="loading-bail fixed inset-0 z-[60] flex items-start justify-center bg-cream"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {/* hangs from the top of the screen and sways (CSS, so the overlay can unmount) */}
          <div className="sway">
            <div className="h-[18vh] w-px bg-charcoal/70" />
            <div className="-ml-[86px] -mt-[22px]">
              <InkSwinger width={150} height={190} lineTo="M150 22 L150 22" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingScreen;

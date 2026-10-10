"use client";

import { motion } from "framer-motion";
import { InkSwinger } from "@/components/InkSwinger";

const EASE = [0.16, 1, 0.3, 1] as const;

export const SWING_MS = 1250; // whole swing
export const SWING_SWAP_MS = 480; // the page changes while the sweep covers it

/**
 * A hand-inked acrobat swings in on a line, drags a cream sweep across the
 * screen while the page changes underneath, then carries it off to the left.
 */
export function SwingTransition() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* the sweep that hides the swap */}
      <motion.div
        className="absolute inset-0 bg-cream"
        initial={{ x: "102%" }}
        animate={{ x: ["102%", "0%", "0%", "-102%"] }}
        transition={{ duration: SWING_MS / 1000, times: [0, 0.34, 0.56, 1], ease: EASE }}
      />

      {/* the swinger — rides the leading edge of the sweep */}
      <motion.div
        className="absolute left-0 top-0"
        initial={{ x: "112vw", y: "-30vh", rotate: 16 }}
        animate={{
          x: ["112vw", "44vw", "-32vw"],
          y: ["-30vh", "28vh", "-8vh"],
          rotate: [16, -4, -26],
        }}
        transition={{ duration: SWING_MS / 1000, times: [0, 0.45, 1], ease: "easeInOut" }}
      >
        <InkSwinger />
      </motion.div>
    </div>
  );
}

export default SwingTransition;

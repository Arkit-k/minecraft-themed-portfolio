"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Mail } from "lucide-react";
import { profile, mailtoHref } from "@/lib/content";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Always-there way to start an email, pinned bottom-right. Uses the prefilled
 * mailto so enquiries arrive already scoped. z-40 so Build Mode covers it
 * along with the rest of the chrome.
 */
export function EmailPill() {
  const reduce = useReducedMotion();

  return (
    <motion.a
      href={mailtoHref}
      aria-label={`Email ${profile.email}`}
      title={profile.email}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
      whileHover={reduce ? undefined : { y: -2 }}
      className="group fixed bottom-4 right-4 z-40 inline-flex items-center gap-2.5 rounded-full border border-hairline bg-cream/85 px-4 py-2.5 text-sm tracking-tight text-charcoal/80 shadow-[0_1px_20px_rgba(34,34,34,0.07)] backdrop-blur-md transition-colors duration-300 hover:border-charcoal hover:text-charcoal sm:bottom-6 sm:right-6 sm:px-5 sm:py-3 sm:text-[15px]"
    >
      <Mail
        className="h-4 w-4 shrink-0 text-gray-soft transition-colors duration-300 group-hover:text-charcoal"
        strokeWidth={1.6}
      />
      {profile.email}
    </motion.a>
  );
}

export default EmailPill;

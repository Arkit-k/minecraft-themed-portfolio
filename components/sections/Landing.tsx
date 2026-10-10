"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { profile, projects } from "@/lib/content";
import { revealWithSwing } from "@/lib/reveal-state";

const EASE = [0.16, 1, 0.3, 1] as const;

// every project, at a glance: a logo where there is one, the Windback wordmark,
// or a serif monogram. Stealth logos stay blurred.
const monogram = (name: string) => (/^\d/.test(name) ? name.slice(0, 4) : name[0]);

export function Landing() {
  const reduce = useReducedMotion();

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: EASE, delay: reduce ? 0 : delay },
  });

  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[100svh] w-full max-w-editorial flex-col items-center justify-center px-6 py-20 text-center sm:px-10 lg:px-16"
    >
      {/* portrait */}
      <motion.div {...fade(0)} className="relative h-16 w-16 overflow-hidden rounded-full shadow-sm ring-1 ring-charcoal/10">
        <Image src="/avatar.jpg" alt={profile.name} fill sizes="64px" className="object-cover" priority />
      </motion.div>

      {/* name */}
      <motion.p {...fade(0.08)} className="mt-4 text-sm tracking-tight text-gray-soft">
        {profile.name}
      </motion.p>

      {/* what I do */}
      <motion.h1
        {...fade(0.16)}
        className="mt-6 max-w-[18ch] text-pretty font-instrument text-[clamp(2.1rem,5.4vw,3.4rem)] leading-[1.08] tracking-tightest text-charcoal"
      >
        {profile.headline}
      </motion.h1>

      {/* what I've worked on */}
      <motion.ul {...fade(0.26)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {projects.filter((p) => !p.hideOnLanding).map((p, i) => {
          const tile = p.logo ? (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_2px_14px_rgba(34,34,34,0.10)] transition-transform duration-300 hover:-translate-y-1">
              <Image
                src={p.logo}
                alt=""
                width={56}
                height={56}
                draggable={false}
                className="h-7 w-7 select-none object-contain"
              />
            </span>
          ) : p.wordmark ? (
            <span
              className="flex h-12 items-center rounded-2xl bg-white px-4 font-instrument text-lg leading-none shadow-[0_2px_14px_rgba(34,34,34,0.10)] transition-transform duration-300 hover:-translate-y-1"
              style={p.color ? { color: p.color } : undefined}
            >
              {p.wordmark}
            </span>
          ) : (
            <span className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-white px-3 font-instrument text-xl leading-none text-charcoal shadow-[0_2px_14px_rgba(34,34,34,0.10)] transition-transform duration-300 hover:-translate-y-1">
              {monogram(p.name)}
            </span>
          );
          const href = p.stealth ? undefined : p.demo ?? p.github;
          return (
            <li key={`${p.name}-${i}`} title={p.stealth ? "Stealth project · under NDA" : p.name}>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={p.name}>
                  {tile}
                </a>
              ) : (
                tile
              )}
            </li>
          );
        })}
      </motion.ul>

      {/* a short brief */}
      <motion.p
        {...fade(0.34)}
        className="mt-10 max-w-md text-pretty text-[15px] leading-relaxed text-gray-soft"
      >
        {profile.brief}
      </motion.p>

      {/* the only way in: no scrolling on this screen */}
      <motion.button
        type="button"
        onClick={() => revealWithSwing(true, !reduce)}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: reduce ? 0 : 0.5 }}
        className="mt-12 inline-flex items-center gap-2 rounded-full border border-hairline bg-cream/85 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-charcoal/80 shadow-[0_1px_16px_rgba(34,34,34,0.06)] backdrop-blur-md transition-colors hover:border-charcoal hover:text-charcoal"
      >
        Show more
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} />
      </motion.button>

    </section>
  );
}

export default Landing;

"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { profile } from "@/lib/content";

const ParticleHero = dynamic(
  () => import("@/components/ParticleHero").then((m) => m.ParticleHero),
  { ssr: false }
);

const EASE = [0.16, 1, 0.3, 1] as const;

function RevealWord({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <span>{text}</span>;
  const letters = Array.from(text);
  return (
    <span className="inline-block whitespace-nowrap">
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: "0.5em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 1,
            ease: EASE,
            delay: delay + i * 0.035,
          }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[100svh] w-full max-w-editorial flex-col justify-center px-6 pt-28 pb-20 sm:px-10 lg:px-16"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* Text column */}
        <div className="order-2 lg:order-1">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.1 }}
            className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-gray-soft"
          >
            <span className="h-px w-8 bg-charcoal/30" />
            {profile.role}
          </motion.p>

          <h1 className="font-instrument text-[clamp(3.2rem,9vw,7rem)] leading-[0.95] tracking-tightest text-charcoal">
            <RevealWord text="Arkit" delay={0.15} />
            <br />
            <span className="italic text-graphite">
              <RevealWord text="Karmokar" delay={0.4} />
            </span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
            className="mt-8 max-w-md text-pretty text-lg leading-relaxed text-gray-soft sm:text-xl"
          >
            {profile.philosophy}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 1.1 }}
            className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-charcoal/80"
          >
            {profile.roles.map((r, i) => (
              <span key={r} className="flex items-center gap-3">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-charcoal/25" />}
                <span className="tracking-tight">{r}</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* Artwork column */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.5 }}
          className="order-1 lg:order-2"
        >
          <ParticleHero className="mx-auto aspect-[3/2] w-full max-w-[560px] lg:max-w-none" />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 1.6 }}
        className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-gray-soft sm:flex"
      >
        <span className="text-[11px] uppercase tracking-[0.3em]">Scroll</span>
        <motion.span
          className="h-8 w-px bg-charcoal/25"
          animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3], originY: 0 }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
}

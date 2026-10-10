"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, Linkedin, Github, Twitter } from "lucide-react";
import { AudioPill } from "@/components/AudioPill";
import { profile } from "@/lib/content";

const ParticleHero = dynamic(
  () => import("@/components/ParticleHero").then((m) => m.ParticleHero),
  { ssr: false }
);

const EASE = [0.16, 1, 0.3, 1] as const;

const socials = [
  { label: "Email", href: `mailto:${profile.email}`, Icon: Mail },
  { label: "LinkedIn", href: profile.linkedin, Icon: Linkedin },
  { label: "GitHub", href: profile.github, Icon: Github },
  { label: "Twitter", href: profile.twitter, Icon: Twitter },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="intro"
      className="relative mx-auto flex min-h-[100svh] w-full max-w-editorial flex-col justify-center px-6 pt-28 pb-40 sm:px-10 lg:px-16"
    >
      {/* artwork backdrop — sits behind the profile block */}
      <motion.div
        aria-hidden
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.4 }}
        className="pointer-events-none absolute left-1/2 top-[calc(50%-3rem)] z-0 w-full max-w-[920px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(ellipse_58%_54%_at_50%_46%,transparent_38%,black_82%)] [-webkit-mask-image:radial-gradient(ellipse_58%_54%_at_50%_46%,transparent_38%,black_82%)] sm:w-[130%]"
      >
        <ParticleHero className="aspect-[3/2] w-full" />
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE }}
        className="relative z-10 mx-auto flex w-full flex-col items-center text-center"
      >
        {/* avatar */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full shadow-sm ring-1 ring-charcoal/10 sm:h-32 sm:w-32">
          <Image
            src="/avatar.jpg"
            alt={profile.name}
            fill
            sizes="128px"
            className="object-cover"
            priority
          />
        </div>

        {/* name */}
        <h1 className="mt-8 font-instrument text-[clamp(2.8rem,8vw,5rem)] leading-[1.0] tracking-tightest text-charcoal">
          Arkit <span className="italic text-graphite">Karmokar</span>
        </h1>

        {/* how he'd say it himself — not the jobTitle, which lives in the schema */}
        <p className="mt-3 text-lg text-gray-soft sm:text-xl">{profile.heroLabel}</p>

        {/* inline social icons — Email / LinkedIn / GitHub / Twitter */}
        <div className="mt-5 flex items-center justify-center gap-4 text-gray-soft">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              title={s.label}
              {...(s.href.startsWith("mailto")
                ? {}
                : { target: "_blank", rel: "noreferrer" })}
              className="transition-colors duration-300 hover:text-charcoal"
            >
              <s.Icon className="h-5 w-5" strokeWidth={1.6} />
            </a>
          ))}
        </div>

        {/* tagline */}
        <p className="mt-8 max-w-md text-pretty text-lg leading-relaxed text-gray-soft">
          {profile.philosophy}
        </p>

        {/* intro music */}
        <div className="mt-8 flex w-full justify-center">
          <AudioPill src={profile.introAudio} label="intro music" />
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 1.2 }}
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

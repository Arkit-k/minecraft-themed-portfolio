"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import { SectionLabel } from "@/components/SectionLabel";
import { TechIcon } from "@/components/TechIcon";
import { projects } from "@/lib/content";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Projects() {
  const reduce = useReducedMotion();

  return (
    <section
      id="projects"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <SectionLabel index="03">Selected Work</SectionLabel>

      <div className="border-t border-hairline">
        {projects.map((p, i) => (
          <motion.article
            key={`${p.name}-${i}`}
            initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
            transition={{ duration: 1, ease: EASE, delay: i * 0.05 }}
            className="group relative border-b border-hairline"
          >
            <motion.div
              whileHover={reduce ? undefined : { y: -4 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="grid gap-y-5 py-10 sm:py-12"
            >
              {/* Left: identity */}
              <div>
                {/* big logo beside a name / role / context stack */}
                <div className="flex items-center gap-5 sm:gap-6">
                  {p.logo && (
                    <Image
                      src={p.logo}
                      alt=""
                      width={96}
                      height={96}
                      draggable={false}
                      className="h-16 w-16 shrink-0 select-none object-contain sm:h-20 sm:w-20"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-4 lg:justify-start">
                      <h3
                        className={`font-serif text-3xl tracking-tight text-charcoal sm:text-4xl ${
                          p.stealth ? "" : "transition-colors duration-500 group-hover:text-graphite"
                        }`}
                        style={p.color ? { color: p.color } : undefined}
                      >
                        {p.stealth ? (
                          // under NDA: a blurred placeholder, never the real name, and it stays blurred on hover
                          <>
                            <span aria-hidden className="select-none blur-[8px]">
                              {p.name}
                            </span>
                            <span className="sr-only">Stealth project under NDA</span>
                          </>
                        ) : (
                          p.wordmark ?? p.name
                        )}
                      </h3>
                      <span className="font-sans text-sm text-gray-soft">{p.year}</span>
                    </div>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-gray-soft">
                      {p.role}
                    </p>
                    <p className="mt-1 text-sm text-gray-soft/80">{p.context}</p>
                    {p.stealth && (
                      <span className="mt-2 inline-block rounded-full bg-charcoal/[0.06] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-gray-soft">
                        Stealth · Under NDA
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-5">
                  {p.github && (
                    <a
                      href={p.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-charcoal/70 transition-colors duration-300 hover:text-charcoal"
                    >
                      <Github className="h-4 w-4" strokeWidth={1.5} />
                      GitHub
                    </a>
                  )}
                  {p.demo && (
                    <a
                      href={p.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-charcoal/70 transition-colors duration-300 hover:text-charcoal"
                    >
                      Visit Site
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>

              {/* Right: narrative + tech */}
              <div>
                <p className="max-w-xl text-pretty text-base leading-relaxed text-gray-soft lg:text-[17px]">
                  {p.description}
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {p.tech.map((t) => (
                    <li key={t}>
                      <TechIcon name={t} />
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

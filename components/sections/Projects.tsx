"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import { SectionLabel } from "@/components/SectionLabel";
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
            key={p.name}
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
                <div className="flex items-baseline justify-between gap-4 lg:justify-start">
                  <h3 className="font-serif text-3xl tracking-tight text-charcoal transition-colors duration-500 group-hover:text-graphite sm:text-4xl">
                    {p.name}
                  </h3>
                  <span className="font-sans text-sm text-gray-soft">{p.year}</span>
                </div>
                <p className="mt-3 text-sm uppercase tracking-[0.18em] text-gray-soft">
                  {p.role}
                </p>
                <p className="mt-1 text-sm text-gray-soft/80">{p.context}</p>

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
                      Live Demo
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
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5">
                  {p.tech.map((t) => (
                    <li key={t} className="text-sm text-charcoal/55">
                      {t}
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

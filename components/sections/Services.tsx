"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { SectionLabel } from "@/components/SectionLabel";
import { Reveal } from "@/components/Reveal";
import { serviceGroups, profile } from "@/lib/content";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * What someone can actually hire me for, in three tiers — scarcest first.
 * Everything else on this page is evidence; this is the part with a price on it.
 */
export function Services() {
  const reduce = useReducedMotion();

  return (
    <section
      id="services"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <SectionLabel index="02">What I Build For You</SectionLabel>

      <Reveal>
        <p className="mb-16 max-w-xl text-pretty text-base leading-relaxed text-gray-soft lg:text-[17px]">
          Fixed scope, fixed price, no retainer. First engagement with a new client
          is a fixed-price trial, so you can see the work before committing.
        </p>
      </Reveal>

      {serviceGroups.map((group, gi) => (
        <div key={group.index} className={gi === 0 ? "" : "mt-20 sm:mt-24"}>
          {/* tier heading */}
          <Reveal>
            <div className="mb-10 flex items-baseline gap-4">
              <span className="font-sans text-xs tracking-[0.25em] text-gray-soft">
                {group.index}
              </span>
              <div className="min-w-0">
                <h3 className="font-serif text-2xl tracking-tight text-charcoal sm:text-3xl">
                  {group.title}
                </h3>
                <p className="mt-1.5 text-pretty text-sm text-gray-soft">
                  {group.blurb}
                </p>
              </div>
            </div>
          </Reveal>

          <div className="border-t border-hairline">
            {group.services.map((s, i) => (
              <motion.article
                key={s.name}
                initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.05 }}
                className="group border-b border-hairline"
              >
                <div className="grid gap-y-5 py-9 sm:py-10 lg:grid-cols-[1fr_auto] lg:gap-x-12">
                  <div className="min-w-0">
                    <h4 className="font-serif text-xl tracking-tight text-charcoal transition-colors duration-500 group-hover:text-graphite sm:text-2xl">
                      {s.name}
                    </h4>

                    <p className="mt-2.5 max-w-xl text-pretty text-base leading-relaxed text-gray-soft">
                      {s.outcome}
                    </p>

                    <ul className="mt-5 space-y-2">
                      {s.includes.map((item) => (
                        <li key={item} className="flex gap-3 text-sm text-gray-soft">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/40"
                            strokeWidth={1.6}
                            aria-hidden
                          />
                          <span className="text-pretty">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {s.proof && (
                      <p className="mt-4 text-sm italic text-gray-soft/80">
                        Built: {s.proof}
                      </p>
                    )}
                  </div>

                  {/* price rail */}
                  <div className="lg:min-w-[140px] lg:text-right">
                    <p className="font-serif text-2xl tracking-tight text-charcoal sm:text-3xl">
                      {s.price}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-soft">
                      {s.turnaround}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      ))}

      <Reveal>
        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex items-center gap-1.5 font-serif text-xl tracking-tight text-charcoal transition-colors duration-300 hover:text-graphite sm:text-2xl"
          >
            {profile.email}
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </a>
          <span className="text-sm text-gray-soft">
            Tell me what&rsquo;s broken or what you want built. I&rsquo;ll tell you
            if it&rsquo;s one of these or not.
          </span>
        </div>
      </Reveal>
    </section>
  );
}

export default Services;

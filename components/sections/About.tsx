import { Reveal } from "@/components/Reveal";
import { SectionLabel } from "@/components/SectionLabel";
import { profile } from "@/lib/content";

export function About() {
  return (
    <section
      id="about"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <SectionLabel index="01">About</SectionLabel>
      <Reveal>
        <p className="max-w-4xl text-balance font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.35] tracking-tight text-charcoal">
          {profile.about}
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-10 max-w-xl text-base leading-relaxed text-gray-soft">
          Based in {profile.location}. Currently building at the intersection of
          AI, automation, and distributed infrastructure.
        </p>
      </Reveal>
    </section>
  );
}

import { Reveal } from "@/components/Reveal";
import { ResumeButton } from "@/components/ResumeButton";
import { profile } from "@/lib/content";

const links = [
  { label: "Email", href: `mailto:${profile.email}`, display: profile.email },
  { label: "GitHub", href: profile.github, display: "github.com/arkit-k" },
  { label: "LinkedIn", href: profile.linkedin, display: "linkedin.com/in/arkit" },
  { label: "Twitter", href: profile.twitter, display: "@arkit_k" },
];

export function Contact() {
  return (
    <section
      id="contact"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 pb-24 pt-24 sm:px-10 sm:pb-32 sm:pt-32 lg:px-16"
    >
      {/* Résumé CTA */}
      <Reveal>
        <div className="mb-24 flex flex-col items-start gap-8 border-y border-hairline py-16 sm:mb-32 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-[clamp(2rem,5vw,3.4rem)] leading-tight tracking-tight text-charcoal">
              The full story, on paper.
            </h2>
            <p className="mt-3 max-w-md text-base text-gray-soft">
              A concise, printable record of experience, projects, and education.
            </p>
          </div>
          <ResumeButton />
        </div>
      </Reveal>

      {/* Contact */}
      <Reveal>
        <p className="font-sans text-xs uppercase tracking-[0.25em] text-gray-soft">
          05 — Contact
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mt-8 max-w-3xl text-balance font-serif text-[clamp(2.4rem,7vw,5rem)] leading-[1.05] tracking-tightest text-charcoal">
          Let&apos;s build something{" "}
          <span className="italic text-graphite">effortless.</span>
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <ul className="mt-16 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.label} className="border-t border-hairline pt-5">
              <a
                href={l.href}
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="group block"
              >
                <span className="block font-sans text-xs uppercase tracking-[0.2em] text-gray-soft">
                  {l.label}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 font-serif text-2xl tracking-tight text-charcoal transition-colors duration-300 group-hover:text-graphite sm:text-3xl">
                  {l.display}
                  <span className="inline-block translate-y-px text-base opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                    →
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Footer */}
      <footer className="mt-28 flex flex-col items-start justify-between gap-3 border-t border-hairline pt-8 text-sm text-gray-soft sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} Arkit Karmokar</span>
        <span className="tracking-tight">
          Designed &amp; built with intention.
        </span>
      </footer>
    </section>
  );
}

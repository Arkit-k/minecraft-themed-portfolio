import { Reveal } from "@/components/Reveal";
import { SectionLabel } from "@/components/SectionLabel";
import { experience, education } from "@/lib/content";

export function Experience() {
  return (
    <section
      id="experience"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <SectionLabel index="02">Experience</SectionLabel>

      <div className="border-t border-hairline">
        {experience.map((job) => (
          <Reveal key={job.company}>
            <article className="grid gap-x-10 gap-y-4 border-b border-hairline py-10 sm:py-14 lg:grid-cols-[0.4fr_0.6fr]">
              <div>
                <h3 className="font-serif text-2xl tracking-tight text-charcoal sm:text-3xl">
                  {job.company}
                </h3>
                <p className="mt-2 text-sm text-charcoal/80">{job.title}</p>
                <p className="mt-4 text-sm text-gray-soft">{job.period}</p>
                <p className="text-sm text-gray-soft">{job.location}</p>
              </div>
              <p className="max-w-xl text-pretty text-base leading-relaxed text-gray-soft lg:text-[17px]">
                {job.description}
              </p>
            </article>
          </Reveal>
        ))}

        {/* Education as a quiet final timeline entry */}
        <Reveal>
          <article className="grid gap-x-10 gap-y-4 border-b border-hairline py-10 sm:py-14 lg:grid-cols-[0.4fr_0.6fr]">
            <div>
              <h3 className="font-serif text-2xl tracking-tight text-charcoal sm:text-3xl">
                {education.school}
              </h3>
              <p className="mt-2 text-sm text-charcoal/80">{education.degree}</p>
              <p className="mt-4 text-sm text-gray-soft">{education.period}</p>
              <p className="text-sm text-gray-soft">{education.location}</p>
            </div>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-gray-soft lg:text-[17px]">
              {education.coursework}
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

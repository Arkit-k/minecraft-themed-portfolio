import { Reveal } from "@/components/Reveal";
import { SectionLabel } from "@/components/SectionLabel";
import { skills } from "@/lib/content";

function Column({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-6 font-sans text-xs uppercase tracking-[0.22em] text-gray-soft">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((s) => (
          <li
            key={s}
            className="font-serif text-xl tracking-tight text-charcoal sm:text-2xl"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Skills() {
  return (
    <section
      id="skills"
      className="mx-auto w-full max-w-editorial scroll-mt-24 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <SectionLabel index="04">Capabilities</SectionLabel>
      <Reveal>
        <div className="grid gap-12 sm:grid-cols-2 lg:gap-20">
          <Column title="Technical" items={skills.technical} />
          <Column title="Systems" items={skills.systems} />
        </div>
      </Reveal>
    </section>
  );
}

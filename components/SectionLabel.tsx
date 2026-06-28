import { Reveal } from "@/components/Reveal";

export function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-12 flex items-baseline gap-4 sm:mb-16">
        <span className="font-sans text-xs tracking-[0.25em] text-gray-soft">
          {index}
        </span>
        <span className="h-px flex-1 bg-hairline" />
        <span className="font-sans text-xs uppercase tracking-[0.25em] text-gray-soft">
          {children}
        </span>
      </div>
    </Reveal>
  );
}

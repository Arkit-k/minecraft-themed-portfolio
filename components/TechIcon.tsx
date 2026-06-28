import {
  siTypescript,
  siNodedotjs,
  siNextdotjs,
  siRedis,
  siDocker,
  siJavascript,
  siPython,
  siPostgresql,
  siSolana,
  siRender,
  siGooglegemini,
  siAnthropic,
  siMongodb,
  siExpress,
  siBun,
  siHono,
  siDjango,
} from "simple-icons";
import {
  Terminal,
  Plug,
  ShieldCheck,
  Sparkles,
  KeyRound,
  MessagesSquare,
  Boxes,
  Cloud,
  Cpu,
  type LucideIcon,
} from "lucide-react";

type SimpleIcon = { path: string; title: string; hex: string };

// brand logos (monochrome — rendered in currentColor to fit the palette)
const BRAND: Record<string, SimpleIcon> = {
  typescript: siTypescript,
  "node.js": siNodedotjs,
  "next.js": siNextdotjs,
  redis: siRedis,
  docker: siDocker,
  javascript: siJavascript,
  python: siPython,
  postgresql: siPostgresql,
  solana: siSolana,
  render: siRender,
  "gemini api": siGooglegemini,
  "claude code": siAnthropic,
  mongodb: siMongodb,
  express: siExpress,
  bun: siBun,
  hono: siHono,
  django: siDjango,
};

// concepts that have no brand mark → a meaningful glyph instead
const GLYPH: Record<string, LucideIcon> = {
  cli: Terminal,
  mcp: Plug,
  security: ShieldCheck,
  "ai models": Sparkles,
  rbac: KeyRound,
  nlu: MessagesSquare,
  web3: Boxes,
  aws: Cloud,
};

export function TechIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  const brand = BRAND[key];
  const Glyph = GLYPH[key] ?? Cpu;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-cream/50 px-2.5 py-1 text-xs tracking-tight text-charcoal/75">
      {brand ? (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill={`#${brand.hex}`}
          aria-hidden="true"
        >
          <path d={brand.path} />
        </svg>
      ) : (
        <Glyph className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      )}
      {name}
    </span>
  );
}

export default TechIcon;

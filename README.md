# Arkit Karmokar — Portfolio

A one-page, neo-minimalist portfolio. Warm cream, charcoal type, Swiss-editorial
rhythm, and a procedural particle portrait rendered from a halftone source image.

Built to feel quiet, premium, and timeless — typography as the hero, motion as a whisper.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling / design tokens
- **Framer Motion** for calm, custom-eased reveals
- **lucide-react** for the few icons used
- **next/font** — Instrument Serif (display) + Inter (body), self-hosted

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## The hero artwork

`components/ParticleHero.tsx` samples brightness from `public/hero-sample.png`
on a grid, builds a charcoal dot-cloud, and animates it on `<canvas>`:

- gentle sine-based drift / breathing
- subtle pointer repulsion
- pauses off-screen (IntersectionObserver) and respects `prefers-reduced-motion`

`hero-sample.png` (small, grayscale) and `og.jpg` are generated from the original
artwork via `npm run optimize:image` (place the source at `public/hero.png` first).

## Content

All résumé content lives in `lib/content.ts` — the single source of truth.
The résumé PDF is served from `public/arkit-karmokar-resume.pdf`.

## Deploy

Optimized for **Vercel** — push the repo and import. No environment variables required.
# minecraft-themed-portfolio

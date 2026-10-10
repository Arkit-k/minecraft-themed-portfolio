// Single source of truth for the canonical site URL + name. Override the URL
// per-environment with NEXT_PUBLIC_SITE_URL (e.g. your live domain on Vercel);
// falls back to the intended production domain.
// NOTE: the fallback MUST be a domain that actually resolves. It previously
// defaulted to arkitkarmokar.com, which is not registered — so every canonical
// tag, og:url, sitemap <loc>, robots Host and JSON-LD @id pointed at NXDOMAIN,
// telling Google the real page lived somewhere that does not exist.
// Apex 308-redirects to www, so www is the canonical host.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.arkit.live"
).replace(/\/$/, "");

export const SITE_NAME = "Arkit Karmokar";

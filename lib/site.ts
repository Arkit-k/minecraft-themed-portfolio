// Single source of truth for the canonical site URL + name. Override the URL
// per-environment with NEXT_PUBLIC_SITE_URL (e.g. your live domain on Vercel);
// falls back to the intended production domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://arkitkarmokar.com"
).replace(/\/$/, "");

export const SITE_NAME = "Arkit Karmokar";

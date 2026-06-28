import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Open to everyone — including AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended, etc.) — since the goal is to be indexed AND cited by
// generative engines. A permissive policy means no agent is blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Full Stack Developer`,
    short_name: SITE_NAME,
    description:
      "Full Stack Developer building SaaS platforms and distributed systems.",
    start_url: "/",
    display: "standalone",
    background_color: "#EEE5D1",
    theme_color: "#EEE5D1",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

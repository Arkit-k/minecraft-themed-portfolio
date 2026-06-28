"use client";

import { ArrowUpRight } from "lucide-react";
import { profile } from "@/lib/content";

export function ResumeButton() {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open for viewing in a new tab...
    window.open(profile.resume, "_blank", "noopener,noreferrer");
    // ...and trigger a download.
    const a = document.createElement("a");
    a.href = profile.resume;
    a.download = "Arkit-Karmokar-Resume.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <a
      href={profile.resume}
      onClick={handleClick}
      className="group inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-charcoal/20 px-6 py-2.5 text-sm tracking-tight text-charcoal shadow-sm transition-all duration-500 ease-calm hover:border-charcoal hover:bg-charcoal hover:text-cream"
    >
      View &amp; Download Résumé
      <ArrowUpRight
        className="h-4 w-4 transition-transform duration-500 ease-calm group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={1.5}
      />
    </a>
  );
}

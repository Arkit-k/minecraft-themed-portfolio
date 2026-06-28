"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function Nav() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string>("about");
  const [open, setOpen] = useState(false); // mobile menu

  // Show after leaving the hero; hide when scrolling down, reveal when scrolling up.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const past = y > window.innerHeight * 0.6;
      const scrollingUp = y < lastY;
      const vis =
        past && (scrollingUp || y + window.innerHeight > document.body.scrollHeight - 4);
      setVisible(vis);
      if (!vis) setOpen(false); // collapse the mobile menu when the nav hides
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active-section tracking.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeLabel = SECTIONS.find((s) => s.id === active)?.label ?? "Menu";

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={reduce ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed left-1/2 top-4 z-40 flex -translate-x-1/2 flex-col items-center sm:top-5"
        >
          {/* desktop: horizontal pill */}
          <ul className="hidden items-center gap-2 rounded-full border border-hairline bg-cream/85 px-3 py-1.5 shadow-[0_1px_20px_rgba(34,34,34,0.05)] backdrop-blur-md sm:flex">
            {SECTIONS.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => go(e, id)}
                    className="relative block whitespace-nowrap rounded-full px-3 py-1.5 text-sm tracking-tight text-gray-soft transition-colors duration-300 hover:text-charcoal"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-charcoal/[0.06]"
                        transition={{ duration: 0.5, ease: EASE }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? "text-charcoal" : ""}`}>
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {/* mobile: compact menu button that expands a dropdown */}
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-hairline bg-cream/90 px-4 py-2 text-sm tracking-tight text-charcoal shadow-[0_1px_20px_rgba(34,34,34,0.06)] backdrop-blur-md sm:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{activeLabel}</span>
          </button>

          <AnimatePresence>
            {open && (
              <motion.ul
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mt-2 flex w-44 flex-col gap-0.5 rounded-2xl border border-hairline bg-cream/95 p-1.5 shadow-[0_8px_30px_rgba(34,34,34,0.12)] backdrop-blur-md sm:hidden"
              >
                {SECTIONS.map(({ id, label }) => {
                  const isActive = active === id;
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        onClick={(e) => go(e, id)}
                        className={`block rounded-xl px-3 py-2.5 text-sm tracking-tight transition-colors ${
                          isActive
                            ? "bg-charcoal/[0.07] text-charcoal"
                            : "text-gray-soft hover:text-charcoal"
                        }`}
                      >
                        {label}
                      </a>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

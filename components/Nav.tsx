"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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

  // Show after leaving the hero; hide when scrolling down, reveal when scrolling up.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const past = y > window.innerHeight * 0.6;
      const scrollingUp = y < lastY;
      setVisible(past && (scrollingUp || y + window.innerHeight > document.body.scrollHeight - 4));
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

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={reduce ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed left-1/2 top-4 z-40 w-auto max-w-[calc(100vw-1rem)] -translate-x-1/2 sm:top-5"
        >
          <ul className="no-scrollbar flex flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full border border-hairline bg-cream/85 px-1.5 py-1.5 shadow-[0_1px_20px_rgba(34,34,34,0.05)] backdrop-blur-md sm:gap-2 sm:px-3">
            {SECTIONS.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => handleClick(e, id)}
                    className="relative block shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] tracking-tight text-gray-soft transition-colors duration-300 hover:text-charcoal sm:px-3 sm:text-sm"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-charcoal/[0.06]"
                        transition={{ duration: 0.5, ease: EASE }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${isActive ? "text-charcoal" : ""}`}
                    >
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

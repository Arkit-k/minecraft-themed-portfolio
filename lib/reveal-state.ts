"use client";

/**
 * Whether the rest of the page (everything under the hero) has been opened.
 * The landing screen is just the hero; "Show more" reveals the sections, and
 * any deep link or nav jump opens them too.
 */

import { useEffect, useState } from "react";

let revealed = false;
const listeners = new Set<(v: boolean) => void>();

export function isRevealed() {
  return revealed;
}

export function setRevealed(v: boolean) {
  if (v === revealed) return;
  revealed = v;
  listeners.forEach((fn) => fn(v));
}

export function subscribeReveal(fn: (v: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useRevealed() {
  const [v, setV] = useState(revealed);
  useEffect(() => subscribeReveal(setV), []);
  return v;
}

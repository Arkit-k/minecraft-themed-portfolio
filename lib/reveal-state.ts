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

// the swing-across transition that covers the swap
let swinging = false;
const swingListeners = new Set<(v: boolean) => void>();

function setSwinging(v: boolean) {
  if (v === swinging) return;
  swinging = v;
  swingListeners.forEach((fn) => fn(v));
}

export function subscribeSwing(fn: (v: boolean) => void) {
  swingListeners.add(fn);
  return () => {
    swingListeners.delete(fn);
  };
}

export function useSwinging() {
  const [v, setV] = useState(swinging);
  useEffect(() => subscribeSwing(setV), []);
  return v;
}

/**
 * Switch versions immediately.
 *
 * This used to hold the swap behind a 1250ms swinging figure, which read as the
 * page hanging on "Show more". The signature is kept so callers don't change;
 * the animate/swingMs/swapMs arguments are now ignored.
 */
export function revealWithSwing(
  next: boolean,
  _animate = true,
  _swingMs = 1250,
  _swapMs = 480,
) {
  setRevealed(next);
}

export function useRevealed() {
  const [v, setV] = useState(revealed);
  useEffect(() => subscribeReveal(setV), []);
  return v;
}

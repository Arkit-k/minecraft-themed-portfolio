/**
 * Tiny shared flag for whether the 3D Build Mode is active.
 * Other interactive layers (cursor, creatures, drag-builder) subscribe to this
 * and pause themselves while the game is running. Also toggles a class on
 * <html> so CSS can fade the portfolio content behind the game.
 */

let active = false;
const listeners = new Set<(v: boolean) => void>();

export function isBuildModeActive() {
  return active;
}

export function setBuildModeActive(v: boolean) {
  if (v === active) return;
  active = v;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("build-mode-active", v);
    window.dispatchEvent(new CustomEvent("buildmode:change", { detail: v }));
  }
  listeners.forEach((fn) => fn(v));
}

export function subscribeBuildMode(fn: (v: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

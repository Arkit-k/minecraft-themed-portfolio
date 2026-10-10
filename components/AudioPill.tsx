"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";

// resting waveform (% heights) shown before the music starts — fixed so server and client match
const IDLE_BARS = [
  14, 14, 18, 14, 30, 55, 80, 45, 90, 60, 35, 14, 14, 18, 14, 14, 14, 22, 14, 14,
  14, 14, 18, 14, 14, 14, 14, 14, 22, 70, 40, 18, 14, 14, 14, 14, 18, 14, 14, 14,
  14, 14, 14, 18, 14, 14, 14, 14, 14, 18, 14, 14, 14, 14, 14, 14, 18, 14, 14, 22,
  14, 14, 18, 14,
];

const TICK_MS = 220; // a new bar enters on the right this often while playing
const BAR_PITCH = 6; // px: 2px bar + 4px gap, must match the classes below
const MIN_BAR = 14; // % height of a quiet bar
const MAX_BAR = 88; // % height of a loud bar
const SMOOTHING = 0.35; // how quickly a bar follows the music (0–1, lower is calmer)
const BASELINE_RATE = 0.08; // how quickly "recent loudness" adapts (~2.5s at this tick rate)
const WARMUP_TICKS = 12; // adapt faster at first so a quiet intro doesn't skew the baseline

// equalizer bars shown in the floating player while music plays
export function AudioPill({ src, label }: { src: string; label: string }) {
  const reduce = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barEls = useRef<(HTMLSpanElement | null)[]>([]);
  const bars = useRef<number[]>([...IDLE_BARS]);
  const analyser = useRef<{ node: AnalyserNode; data: Uint8Array<ArrayBuffer>; ctx: AudioContext } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // an error can land before hydration attaches the handler
  useEffect(() => {
    if (audioRef.current?.error) setFailed(true);
  }, []);

  // scrolling waveform: every tick the oldest bar drops off the left and a new one,
  // sized by the music's loudness compared with the last few seconds, enters on the right
  useEffect(() => {
    if (!playing) return;
    const track = trackRef.current;
    let raf = 0;
    let lastTick = performance.now();
    let ticks = 0;
    let smooth = 0; // eased loudness, so bars don't jump between readings
    let baseline = 0; // recent typical loudness, so a constantly loud track still has shape

    const level = () => {
      const a = analyser.current;
      let raw: number;
      if (a) {
        a.node.getByteTimeDomainData(a.data);
        let sum = 0;
        for (const v of a.data) sum += ((v - 128) / 128) ** 2;
        raw = Math.sqrt(sum / a.data.length);
      } else {
        raw = 0.2 + Math.random() * 0.2; // no Web Audio: gentle simulated bars
      }
      ticks++;
      smooth = smooth ? smooth + (raw - smooth) * SMOOTHING : raw;
      const rate = ticks < WARMUP_TICKS ? 0.4 : BASELINE_RATE;
      baseline = baseline ? baseline + (smooth - baseline) * rate : smooth;
      if (baseline <= 0) return MIN_BAR;
      // typical loudness sits mid-height; twice as loud leans tall, half as loud leans short,
      // and the curve eases toward the ends instead of clipping
      const t = 0.5 + 0.5 * Math.tanh(Math.log2(smooth / baseline) * 1.4);
      return MIN_BAR + t * (MAX_BAR - MIN_BAR);
    };

    const frame = (now: number) => {
      if (now - lastTick >= TICK_MS) {
        lastTick = now;
        bars.current.shift();
        bars.current.push(level());
        bars.current.forEach((h, i) => {
          const el = barEls.current[i];
          if (el) el.style.height = `${h}%`;
        });
      }
      // glide left between ticks so the bars flow instead of stepping
      if (track && !reduce) {
        const t = Math.min((now - lastTick) / TICK_MS, 1);
        track.style.transform = `translateX(${(1 - t) * BAR_PITCH}px)`;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (track) track.style.transform = "";
    };
  }, [playing, reduce]);

  // route the audio through an analyser so the bars follow the real music (needs a user gesture)
  const connectAnalyser = () => {
    const a = audioRef.current;
    if (!a || analyser.current || typeof AudioContext === "undefined") return;
    try {
      const ctx = new AudioContext();
      const node = ctx.createAnalyser();
      node.fftSize = 4096; // ~90ms of sound per reading: steadier than a short slice
      ctx.createMediaElementSource(a).connect(node);
      node.connect(ctx.destination);
      analyser.current = { node, data: new Uint8Array(node.fftSize), ctx };
    } catch {
      /* fall back to simulated bars */
    }
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a || failed) return;
    if (a.paused) {
      connectAnalyser();
      analyser.current?.ctx.resume();
      a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  };

  const toggleLabel = playing ? `Pause ${label}` : `Play ${label}`;

  return (
    <div className="flex h-14 w-full max-w-[22rem] items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={toggleLabel}
        title={failed ? "Audio unavailable" : undefined}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-orange-500 transition-colors duration-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? (
          <Pause className="h-5 w-5 fill-current" strokeWidth={0} />
        ) : (
          <Play className="h-5 w-5 fill-current" strokeWidth={0} />
        )}
      </button>

      {/* right-anchored so the newest bar is always at the edge; old bars fade out on the left */}
      <div
        aria-hidden
        className="flex h-8 min-w-0 flex-1 justify-end overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_22%)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_22%)]"
      >
        <div ref={trackRef} className="flex h-full shrink-0 items-center gap-[4px] will-change-transform">
          {IDLE_BARS.map((h, i) => (
            <span
              key={i}
              ref={(el) => {
                barEls.current[i] = el;
              }}
              className="w-[2px] rounded-full bg-charcoal/40 transition-[height] duration-300 ease-out"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />

    </div>
  );
}

export default AudioPill;

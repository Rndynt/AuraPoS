import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "kds_sound_muted";

function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playBeep(ctx: AudioContext, freq: number, startTime: number, duration: number, gain: number) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export type KDSSoundType = "new_ticket" | "ready";

export function useKDSSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "true");
  const resumedRef = useRef(false);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    const ctx = ctxRef.current;
    if (!ctx) return null;
    if (ctx.state === "suspended" && !resumedRef.current) {
      ctx.resume().catch(() => {});
      resumedRef.current = true;
    }
    return ctx;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, String(next));
      return next;
    });
  }, []);

  const play = useCallback((type: KDSSoundType = "new_ticket") => {
    if (isMuted) return;
    const ctx = ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (type === "new_ticket") {
      playBeep(ctx, 880, t,        0.18, 0.4);
      playBeep(ctx, 1100, t + 0.22, 0.18, 0.4);
      playBeep(ctx, 1320, t + 0.44, 0.28, 0.5);
    } else if (type === "ready") {
      playBeep(ctx, 660,  t,        0.15, 0.35);
      playBeep(ctx, 880,  t + 0.18, 0.15, 0.35);
      playBeep(ctx, 1100, t + 0.36, 0.15, 0.35);
      playBeep(ctx, 1320, t + 0.54, 0.25, 0.5);
    }
  }, [isMuted, ensureContext]);

  const unlock = useCallback(() => {
    ensureContext();
  }, [ensureContext]);

  return { play, isMuted, toggleMute, unlock };
}

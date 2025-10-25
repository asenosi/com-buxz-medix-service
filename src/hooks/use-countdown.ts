import { useEffect, useMemo, useRef, useState } from "react";

export interface Countdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOver: boolean;
}

/**
 * use-countdown
 * Simple countdown hook to a target date.
 * Updates every second and calls onComplete exactly once when it hits zero.
 */
export function useCountdown(target: Date | null | undefined, onComplete?: () => void): Countdown {
  const [now, setNow] = useState<number>(() => Date.now());
  const calledRef = useRef(false);

  const totalMs = useMemo(() => {
    if (!target) return 0;
    return Math.max(0, target.getTime() - now);
  }, [target, now]);

  const value = useMemo<Countdown>(() => {
    const ms = totalMs;
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return { totalMs: ms, days, hours, minutes, seconds, isOver: ms === 0 };
  }, [totalMs]);

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (!target || !onComplete) return;
    if (value.isOver && !calledRef.current) {
      calledRef.current = true;
      onComplete();
    }
  }, [value.isOver, onComplete, target]);

  useEffect(() => {
    // reset the onComplete guard when target changes
    calledRef.current = false;
  }, [target]);

  return value;
}


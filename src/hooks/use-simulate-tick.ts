import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { simulateTick } from "@/lib/simulate.functions";

/**
 * While mounted, periodically calls the simulate-tick server function so that
 * the demo dashboard appears to receive a steady stream of new metrics and
 * activity events. Realtime subscriptions push these inserts back to the UI.
 */
export function useSimulateTick(intervalMs = 8000) {
  const tick = useServerFn(simulateTick);
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      if (running.current || cancelled) return;
      running.current = true;
      try {
        await tick({});
      } catch {
        // Silently ignore — demo simulation should never break the UI.
      } finally {
        running.current = false;
      }
    }
    // First tick shortly after mount so charts feel live immediately.
    const initial = setTimeout(loop, 1500);
    const id = setInterval(loop, intervalMs);
    return () => { cancelled = true; clearTimeout(initial); clearInterval(id); };
  }, [tick, intervalMs]);
}

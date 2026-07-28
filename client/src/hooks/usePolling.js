import { useEffect, useRef } from 'react';

/**
 * Runs `callback` on an interval, with two properties plain setInterval does not
 * give you:
 *
 *  - Polling stops while the tab is hidden and fires once immediately when the
 *    user comes back. A background tab used to keep hitting the API forever.
 *  - The next run is scheduled only after the previous one settles, so slow
 *    responses cannot pile requests up on top of each other.
 *
 * @param {Function} callback   Called on each tick. May return a promise.
 * @param {number}   intervalMs Delay between the end of one run and the next.
 * @param {boolean}  enabled    Set false to suspend polling entirely.
 */
const usePolling = (callback, intervalMs, enabled = true) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let timeoutId = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      if (!document.hidden) {
        try {
          await callbackRef.current();
        } catch {
          // Individual poll failures are not actionable - keep the loop alive
        }
      }

      if (!cancelled) {
        timeoutId = setTimeout(tick, intervalMs);
      }
    };

    tick();

    // Refresh as soon as the tab becomes visible again rather than waiting out
    // the remainder of the interval
    const handleVisibilityChange = () => {
      if (document.hidden || cancelled) return;
      clearTimeout(timeoutId);
      tick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
};

export default usePolling;

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "../format";
import { isOverdue } from "../rhythm";

/**
 * How long ago the newest block landed, kept moving.
 *
 * Its own component, and therefore its own render, because the data behind it refreshes every
 * five seconds while the number has to move every one. A counter that freezes during a stall
 * reads as a broken page — which is the opposite of what it should be telling you, and the
 * moment the reader most needs to believe what is on screen.
 */
export function Since({ at }: { at: number }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{timeAgo(at)}</>;
}

/**
 * How long the chain has been quiet, against how long it usually is.
 *
 * The one thing on the page that moves continuously, which is exactly what makes a frozen one
 * mean something. On a healthy chain it is a slow sweep you stop noticing; during a stall it
 * sits full and red before anybody has read a number.
 *
 * It writes to the DOM through a ref instead of through state on purpose. At six frames a
 * second a state update would reconcile this component — and, if the value lived any higher up,
 * the block table with it — sixty times for every ten seconds of a page nobody is looking at.
 * An animation loop is the one place where reaching past React is cheaper than asking it.
 */
export function Heartbeat({
  /** Timestamp of the newest block, in milliseconds, or null before one is known. */
  lastBlockAt,
  /** The interval this chain has been keeping, in seconds. */
  expected,
}: {
  lastBlockAt: number | null;
  expected: number;
}) {
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    if (lastBlockAt === null) return;

    // Under reduced motion the width still has to change — it is information, not decoration —
    // but the stylesheet has already flattened the transition, so a sweep would land as a
    // stutter. Ticking once a second turns it into an honest stepping counter instead.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function tick() {
      const el = bar.current;
      if (!el) return;
      // Clamped at zero: a validator's clock running ahead of the browser's would otherwise
      // read as a negative age and empty the bar mid-sweep.
      const elapsed = Math.max(0, (Date.now() - lastBlockAt!) / 1000);
      el.style.width = `${(Math.min(1, elapsed / expected) * 100).toFixed(1)}%`;
      el.classList.toggle("over", isOverdue(elapsed, expected));
    }

    tick();
    const id = setInterval(tick, calm ? 1000 : 150);
    return () => clearInterval(id);
  }, [lastBlockAt, expected]);

  return (
    <div
      className="beat"
      title={`Time since the last block, against the ${expected.toFixed(1)}s interval this chain has been keeping`}
    >
      <i ref={bar} />
    </div>
  );
}

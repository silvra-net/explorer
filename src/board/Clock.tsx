import { useEffect, useState } from "react";

/**
 * Wall clock, ticking.
 *
 * The least useful reading on the board and the one that would be missed first. Everything else
 * here can plausibly stand still — a chain can go a minute without a block, a mempool can sit
 * empty — so a screen with nothing moving on it gives a reader no way to tell a healthy quiet
 * chain from a page that died twenty minutes ago. The clock is the control.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const zone = now.getTimezoneOffset() === 0 ? "UTC" : "local";

  return (
    <span className="clock num" title={now.toString()}>
      {now.toTimeString().slice(0, 8)} <span className="dim">{zone}</span>
    </span>
  );
}

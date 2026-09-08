import { useRef, useState } from "react";

/**
 * Hold a live list still while somebody is pointing at it.
 *
 * The board's two feeds refresh every couple of seconds, and every refresh pushes their rows
 * down by however many blocks or transactions arrived. Aiming at a row and pressing the button
 * is then a race: the row you clicked is not the row that was under the pointer when the click
 * landed. This is not a theoretical problem — it happened on the first click of the finished
 * board, and opened the wrong transaction.
 *
 * Freezing on hover rather than on a pause button because the intent is already unambiguous: a
 * pointer resting on a table is somebody reading it. The moment it leaves, the feed catches up
 * in one step.
 */
export function useFreezeOnHover<T>(live: T): {
  value: T;
  frozen: boolean;
  handlers: { onMouseEnter: () => void; onMouseLeave: () => void };
} {
  const [frozen, setFrozen] = useState(false);
  const held = useRef(live);

  if (!frozen) held.current = live;

  return {
    value: frozen ? held.current : live,
    frozen,
    handlers: {
      onMouseEnter: () => setFrozen(true),
      onMouseLeave: () => setFrozen(false),
    },
  };
}

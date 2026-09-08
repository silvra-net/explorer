import type { ReactNode } from "react";

/**
 * One region of the board.
 *
 * Every cell is the same shape: a thin header naming it, an optional reading on the right, and a
 * body that scrolls inside itself. That last part is what makes a board a board — the page does
 * not move, so the eye learns where each answer lives and stops having to search for it.
 *
 * No borders. The grid sits on a `--line` background with 1px gaps, so the hairlines between
 * cells are the background showing through and no two cells can disagree about the rule
 * between them.
 */
export function Cell({
  title,
  aside,
  children,
  area,
  pad = true,
  ownScroll = false,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  /** Grid area name, matching the templates in styles.css. */
  area: string;
  /** Off for cells whose body draws its own edge-to-edge content, such as a table. */
  pad?: boolean;
  /**
   * The child manages its own scrolling, so this body must not also scroll.
   *
   * Without it a cell whose content is a fixed toolbar above a `height: 100%` table ends up with
   * two scrollbars side by side: the table fills the body on its own, the toolbar pushes the
   * pair past the bottom, and both boxes overflow. The body becomes a plain flex column here and
   * the scrolling happens in exactly one place.
   */
  ownScroll?: boolean;
}) {
  const cls = ["body"];
  if (pad) cls.push("pad");
  if (ownScroll) cls.push("own-scroll");

  return (
    <section className="cell" style={{ gridArea: area }}>
      <header>
        <h2>{title}</h2>
        {aside !== undefined && <span className="aside">{aside}</span>}
      </header>
      <div className={cls.join(" ")}>{children}</div>
    </section>
  );
}

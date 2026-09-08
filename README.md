# explorer.silvra.net

The Helix block explorer, published to GitHub Pages at explorer.silvra.net.

## What this repository is, honestly

It holds a **built** explorer, not its source. The build came from the copy that was being
served under `silvra.net/explorer`, with its asset paths rewritten from `/explorer/` to the
root so it can live at the root of its own domain.

That means a change to the explorer cannot be made here. It has to be made wherever the source
lives and rebuilt; then replace `index.html`, `assets/` and `logo.png` in this repository,
rewrite any `/explorer/` prefixes to `/`, and copy `index.html` to `404.html` again.

`404.html` is a copy of `index.html`. GitHub Pages serves it for any path that was never built,
which is what lets a deep link like `/block/41180` survive a hard refresh — Pages answers it
with status 404 and the client router renders the right page.

`silvra-net/helix-explorer` is the *older* explorer and is not what this is. It no longer
publishes anywhere.

## The accent colour is patched

The build shipped a gold accent (`--accent: #d4af37`, plus `--accent-glow` and a lavender
`--lav`). Everything else in it already matched the Helix design system exactly — `--ground`,
`--panel`, `--ink`, `--dim` and the state colours are the same hexes as `helix/gui/src/styles.css`
— so the accent was the one thing making the explorer look like a different product. It is now
white on dark and black on light, which is what that system says an accent is: colour stays
reserved for state, which is why DEGRADED and slow block intervals are still amber.

Seven values in `assets/index-6yly-It2.css`. **A rebuild from source will bring the gold back**
unless the source is changed too.

## Data

Everything on screen comes from the public node at `node.silvra.net`, read from the visitor's
own browser. There is no backend here — this repository serves static files and nothing else.

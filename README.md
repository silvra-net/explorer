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

## Data

Everything on screen comes from the public node at `node.silvra.net`, read from the visitor's
own browser. There is no backend here — this repository serves static files and nothing else.

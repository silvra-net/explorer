# Helix Explorer

A board for watching the Helix chain, published at [explorer.silvra.net](https://explorer.silvra.net/).

## What it is

One screen, no navigation: the vitals on a rail across the top, then the chain verdict, the
block rhythm, the block and transaction streams, the validator set with per-validator
attendance, and an inspector that fills in whatever is selected. Keyboard throughout —
`⌘K` opens the command palette, `/` focuses search, `j`/`k` walk the block list.

## Where the numbers come from

Straight from a node's public RPC, from the visitor's own browser. There is no backend between
you and the chain, and no database of ours that could disagree with it. The endpoint is a
default, not a fixture: the footer has a picker, so pointing it at `http://127.0.0.1:8545` gives
the same board over your own node's copy of the chain.

The endpoint is deliberately **not** settable by URL parameter — `?rpc=…` would let someone hand
you a link that looks like this site and shows a chain of their invention.

## Working on it

```bash
npm install
npm run dev       # http://localhost:5273
npm test          # 76 tests
npm run build
```

A push to `main` runs the tests and publishes. `404.html` is a copy of `index.html`, which is
what lets a deep link like `/block/41180` survive a hard refresh: Pages serves it for any path
that was never built, with status 404, and the client router renders the right page.

## History

This repository previously held a *built* explorer with no source beside it. The source lives
here now; it came from `silvra-net/helix-explorer`, which is the same application and is no
longer published anywhere.

# For AI agents

This repo (`jackgary86-dev/ChessChecker`) is the source of truth for Chess,
Checkers, and Autochess (Chess vs Checkers, auto-battling) development.
Work happens here, on `main`.

## Keep the Game Portal submission in sync

This game is also submitted to the Game Portal (`http://192.168.1.36:2016`,
key `checkers-chess`), which serves it from a **separate** repo and branch:
`jackgary86-dev/Alert`, branch `claude/checkers-chess`. That branch's
`public/` folder is a mirror of this repo's `index.html`, `shared.css`,
`chess/`, `checkers/` and `autochess/` — the portal only reads
`portal-game.json` and `static_dir` from that branch, never from here.

**Whenever a feature ticket lands here** (the NAMES-*, HISTORY-*, ART-01
and AUTOCHESS-* tickets in `TICKETS.md`, or anything after them), also
update that Alert branch so the Game Portal card doesn't go stale:

1. Check out `jackgary86-dev/Alert` with `claude/checkers-chess` already
   checked out (clone it if you don't have it: it's a separate repo, not a
   folder of this one).
2. Run `scripts/sync-to-alert.sh /path/to/alert-checkout` from this repo.
   It copies the current build into `public/` and the test files into
   `test/`, adjusting the tests' relative imports for the deeper nesting.
3. In the Alert checkout: run `node --test test/*.test.js` to confirm it
   still passes, then commit and push `claude/checkers-chess`. No pull
   request is needed — per that repo's `portal/SUBMIT.md` (read from the
   `jackgary86-dev/gameportal` repo), pushing the branch with
   `portal-game.json` present is the entire upload; the portal picks it up
   on its next hourly rebuild.

Do this as part of the same piece of work that lands the feature here —
don't leave the Alert branch to catch up later.

## Local per-port deployment

Independently of the Game Portal, this repo is also meant to run as two
standalone servers on this machine: Chess on port 3012, Checkers on port
3013. See `README.md` for how.

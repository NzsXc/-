# Spectating random and friend battles

Spectating uses the existing authenticated public reads. No Firebase rules update is required.

- `friendRooms` supplies friend match IDs; `freeAccounts/<uid>/active` supplies random match IDs. Both discovery collections are subscribed once, and duplicate participant references are removed.
- Random entries use the local `random:<gameId>` target; this is not a new database path.
- Only the public `players`, `state`, `ready`, `settled`, `transition` and `kind` children are read. Loadouts are fetched only after both players are ready. Live game roots, hidden moves and advance leases are never fetched or modified.
- A broken/stale entry does not hide healthy matches. When a live game is archived/deleted, an existing spectator can restore its final result from `battleHistory`.
- Previous action types are adapted to the shared battle UI action shape (`{data:{type}}`). Rendering errors are logged separately from read failures. A failed read shows a non-blocking reconnect status, preserves the match/result, and clears on the next successful snapshot.
- Confirmed action effects follow the shared countdown deadline, 500 ms battle call and 1,300 ms action reveal. Stopping spectating releases discovery subscriptions and the polling timer.

Run `node tests/spectator.test.cjs` for read-rule, discovery, transition, cancellation and archive-race regressions.

Run `node tests/spectator-ui.test.cjs` with Playwright/Chromium for the actual spectator functions in a browser, backed by a local rules-enforcing Firebase test double. Optional environment variables: `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. This does not access or mutate production Firebase.

# Season 2 tournament titles

| ID | Title | Approved design |
| --- | --- | --- |
| `s2_champion` | Season 2｜CHAMPION | Rainbow glass, rainbow crown and gems |
| `s2_second` | Season 2｜2ND PLACE | Gold glass, no crown |
| `s2_third` | Season 2｜3RD PLACE | Ice glass |
| `s2_fourth` | Season 2｜4TH PLACE | Ice glass |
| `s2_qualifier` | Season 2｜QUALIFIER | Blue sand/spacetime |

The catalog renders these in the collection, equipped slots, battle intros and ranking player profiles. The background uses layout dimensions, not transformed screen dimensions. It pauses when hidden, outside the viewport, or reduced motion is enabled, and releases observers when a badge is removed.

Existing Season 1 awards, equipment and skill progress remain unchanged.

## Firebase rollout

GitHub publication does not publish Firebase rules or assign player awards.

1. Publish the updated `firebase-database.rules.json` to the existing `psy-5d3d1` Realtime Database. This adds only five grant-gated loadout choices to the existing rules.
2. With Firebase administrator access, add the Boolean `true` at each approved `tournamentGrants/<uid>/<titleId>` leaf. Use a multi-location update/PATCH or add individual children in the console; retain all other children and players.
3. Reload the game and equip the awarded title. Awards are not equipped automatically, so existing loadout slots are preserved.

Players cannot write `tournamentGrants`. An absent grant, `false`, or the string `"true"` does not unlock a title.

## Verification

`node tests/titles-season2.test.cjs` checks catalog designs, crown exclusivity, exact grants, ownership, duplicate loadouts, protected grants and artwork at multiple sizes.

`node tests/titles-season2-effects.test.cjs` checks unscaled canvas resolution, visibility, reduced motion and observer cleanup.

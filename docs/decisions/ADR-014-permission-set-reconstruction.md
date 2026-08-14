# ADR-014: Reconstruction of the 22-permission set

**Status:** Accepted (autonomous, flagged for Oracle review)
**Date:** 2026-08-14
**Decided by:** Claude (Digital Agent) during MISSION-000 Step 2

## Definition

The constitution says "22 permissions in 6 groups" but its rank ladder enumerates only 19. The missing three are reconstructed from the legacy v2 permission matrix (seminal *Platform Role System*, superseded but evidentiary, and the legacy `rank.ts` behavior):

- `delete-own-assets` → **create** group (vernacular+) — legacy `canDeleteOwnAssets`.
- `ban-users` → **admin** group (archon+) — legacy `canBanUsers`.
- `promote-vernacular` → **admin** group (archon+) — legacy `canPromoteVernacular`; pairs with the oracle-only `promote-archon` to encode "an Archon manages only ranks below their own".

Final count: browse 3 + identity 3 + season 2 + create 5 + admin 6 + oracle 3 = **22**.

## Epistemic value

The only arithmetic that reaches the constitution's own stated total while preserving the legacy ladder's observable behavior (tested in the legacy suite) and the v2 rule "Archon manages lower ranks only". No new capability was invented; all three permissions existed in the legacy system.

## Pragmatic value

`packages/domain/src/constants/permissions.ts` implements the cumulative ladder with these 22; `resolvePermissions`/`hasPermission`/`meetsMinimumRank` are pure and fully tested, including the cumulative-monotonicity property.

## Consequences

- If the Oracle prefers a different composition of the 22, the change is one constant file + this ADR superseded.
- The constitution's §Ranks table should eventually enumerate all 22 explicitly.

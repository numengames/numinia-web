# Contributing

The rules live in [`numengames/numinia-nwos`](https://github.com/numengames/numinia-nwos)
(`AGENTS.md`, transition regime included). Here, only what is specific to
this code:

1. One pull request per cut, against `main`. No force pushes, no
   self-merge.
2. Every change under `apps/store/src/**` adds an entry to
   `apps/store/src/lib/updates.ts` and raises the version — CI refuses the
   merge otherwise.
3. Run `npm run verify` before pushing; the gates that bite are listed in
   [`CLAUDE.md`](CLAUDE.md).
4. English in code, comments and commits. Conventional commits
   (`feat:`, `fix:`, `docs:`, `chore:`…).
5. Domain names come from the archive (`CAN-003`, `CAN-004` in
   numinia-nwos); the lower-case identifiers in `packages/domain` follow
   them.

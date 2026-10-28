# DEVLOG

Chronological log of the build. One entry per step of `docs/PROMPT.md`, plus anything that went
wrong along the way. Elapsed time counts from the first command (18:48 local).

## Step 1 — Scaffold (00:20 elapsed)

**Did:** Root `package.json` with npm workspaces (`packages/*`, `apps/*`), root scripts (`dev`, `build`,
`test`, `lint`, `typecheck`, `format`), `.nvmrc` (22), `.editorconfig`, `.gitignore`, Prettier,
ESLint flat config (typescript-eslint + react-hooks + jsx-a11y, scoped to `apps/web`), shared
`tsconfig.base.json`, one `tsconfig.json` per workspace (plus `tsconfig.build.json` for the two that
emit). Moved the brief to `docs/BRIEF.md`, created `docs/DECISIONS.md` pre-filled with the 27
decisions from the design review, and this log. Set a repo-local git identity (none was configured).

**Questions that came up:**

- The registry's latest majors are ahead of what I know to be mutually stable (TypeScript 7, ESLint 10,
  Vite 8, Vitest 5). Which majors to pin?
- `npm install` crashed inside npm's resolver (`Cannot read properties of null (reading 'edgesOut')`
  in arborist `#loadPeerSet`) whenever Vitest 4.1.x was in the tree — it happens while resolving
  jsdom's optional `canvas` peer. Vitest 3 and 4.0 install fine but carry `npm audit` criticals
  (tinypool RCE gadget, `@vitest/mocker` path traversal) that are only fixed in Vitest 4.1.12.
- `Intl.DateTimeFormat('en-GB', { month: 'short' })` renders September as "Sept", not "Sep".

**Decided:**

- Pin TypeScript 5.9, ESLint 9, Vite 7, Vitest 4, React 19 — because they are the current LTS-ish
  majors with the ecosystem (plugins, RTL, jsdom) known to be compatible; chasing brand-new majors
  in a timed task is risk without reward. Registered as decision #28.
- Install Vitest 4.1.12 once with `--legacy-peer-deps`, commit the lockfile, and verify that plain
  `npm install` and `npm ci` work from the lockfile (they do: `found 0 vulnerabilities`). The flag
  is only needed when _changing_ dependencies with npm 10.9.8; documented in the README
  troubleshooting note. Registered as decision #29.
- Format months with `en-US` instead of `en-GB` — because the design shows "Sep 2024" and both
  locales order month-then-year identically. Registered as decision #30.
- Keep `docs/PROMPT.md` out of Prettier (it is an input document, not ours to reformat).

**Verified by:** `rm -rf node_modules && npm install && npm run lint && npm run typecheck` — all green;
`npm ci` also green; `npm audit` reports 0 vulnerabilities.

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

## Step 2 — Contracts (00:35 elapsed)

**Did:** `packages/contracts`: zod schemas for the four node levels (`channel` → `employee` →
`branch` → `company`, each extending a shared base of `id`/`name`/`values`), `isoMonthSchema`,
`clientsReportSchema` (`{ months, company }` with a refinement that every node has one value per
month), inferred types, and a `walkCompany()` generator the API and tests reuse. Seven tests, 100%
line coverage. Also extracted the brief's JSON block byte-for-byte into
`apps/api/src/data/clients.json` with a small node script (slice between the fences), so the API
step can serve it unchanged.

**Questions that came up:**

- Where should the payload fixture live so the contracts test can parse it without the contracts
  package depending on the API?
- One recursive schema or one per level? The prompt says "recursive", but the three child keys
  differ (`branches`/`employees`/`channels`).

**Decided:**

- The payload lives in the API (it is what the API serves); the contracts test reads it through a
  relative file path — test-only, one-directional, commented — because duplicating 2 KB of JSON in a
  second place is how the two copies drift apart.
- One schema per level, extending a shared base — because the TS types then say exactly which key a
  level has, and a company cannot accidentally carry `channels`. Decision #31.
- `exports` of the package point at `dist/`; the two apps alias `@nevis/contracts` to `src/` in
  their tsconfig `paths` (and the Vite alias in step 4), so dev/typecheck/tests always see source
  and only the production build consumes `dist/`. Decision #32.

**Verified by:** `npm test -w packages/contracts` (7 passed), `npm run build -w packages/contracts`

- `node -e 'import("@nevis/contracts")'` lists the exports, `npm run lint`, `npm run typecheck`.

## Step 3 — API (00:50 elapsed)

**Did:** `apps/api`: `buildApp({ env, logger })` factory (Fastify 5), `GET /api/health`,
`GET /api/clients` returning `{ months, company }`, `MONTHS` constant (`2024-02` … `2025-01`),
`loadClientsReport()` which parses the JSON + months through `clientsReportSchema` at startup and
throws a readable list of issues if any node's values do not line up with the months. Dev-only
`?delay=<ms>` (clamped to 30 s, non-numeric/negative ignored) and `?fail=1` (500 with a Fastify-style
error body), both ignored when `env === "production"`. `server.ts` listens on `127.0.0.1:3001`
(`API_PORT`/`API_HOST` overridable). Nine `app.inject()` tests including one that asserts
`apps/api/src/data/clients.json` is byte-for-byte the JSON block in `docs/BRIEF.md`.

**Questions that came up:**

- `tsc --noEmit` failed with TS6059 because `rootDir: "src"` plus the `paths` alias pulled
  `packages/contracts/src` into the API program.
- Should the API set CORS headers?
- Listen on `localhost` or `127.0.0.1`? Node ≥17 may resolve `localhost` to `::1`, and a proxy
  targeting `localhost` can then miss a server bound to IPv4.

**Decided:**

- `rootDir` moves to `tsconfig.build.json` only (where `paths` is reset to `{}`), the typecheck
  config has no `rootDir` — because typecheck wants to see the contracts source, the build must not.
- No CORS: the web talks to the API through Vite's dev proxy (and would sit behind the same origin
  in production). Decision #33.
- Bind to `127.0.0.1` and point the Vite proxy at `http://127.0.0.1:3001` explicitly, so the two
  never disagree about IPv4/IPv6. Decision #34.

**Verified by:** `npm test -w apps/api` (9 passed); `npm run build -w apps/api && node apps/api/dist/server.js`
then `curl localhost:3001/api/clients | head -c 300`, `curl …/api/health`, `?fail=1` → 500,
`?delay=700` → 0.70 s; `npx tsx src/server.ts` also serves `/api/health`; lint + typecheck green.

## Step 4 — Web scaffold (01:05 elapsed)

**Did:** `apps/web`: Vite config (React plugin, `@nevis/contracts` → source alias, `/api` proxy to
`127.0.0.1:3001`, Vitest with jsdom + jest-dom setup, non-scoped CSS-module class names in tests),
`index.html`, `main.tsx` (Inter via `@fontsource-variable/inter`, tokens + global CSS),
`app/tokens.css` (every value from the design spec as a custom property), `app/global.css`
(reset, body colours, `:focus-visible` ring, `.tnum` helper), `QueryProvider`, `App` rendering the
"Clients" h1 inside the 1408px content column. One RTL smoke test.

**Questions that came up:**

- First `npm test -w apps/web` failed: `@testing-library/react` 16 has `@testing-library/dom` as a
  _peer_ dependency and `--legacy-peer-deps` (step 1) does not auto-install peers.
- First `npm run dev` served a blank page: Vite logged `Missing field moduleType` from
  `builtin:vite-react-refresh-wrapper` via `node_modules/rolldown`. Root cause: Vitest 4.1 at the
  root had pulled Vite **8** (hoisted), `apps/web` had Vite **7**, and `@vitejs/plugin-react` bound to
  the root copy — two Vite majors in one tree.
- The API started on port 5173: the preview tooling exports `PORT`, which my server honoured.

**Decided:**

- Add `@testing-library/dom` explicitly (it is what RTL asks for) — and treat "install peers by
  hand" as the price of decision #29.
- Pin `vite@^7` at the root as well, so one copy is hoisted and every consumer (app, plugin-react,
  vitest) dedupes to it. `npm ls vite` now shows a single 7.3.7. Decision #35.
- The API reads `API_PORT`/`API_HOST` instead of the generic `PORT`/`HOST`, so a host environment
  that sets `PORT` for the web server cannot hijack the API. Decision #36.

**Verified by:** `npm test -w apps/web` (1 passed), lint + typecheck green, `npm run dev` then in
the browser: body background `rgb(247, 245, 237)`, h1 font-family `"Inter Variable"` at 35px,
`fetch('/api/health')` through the proxy → `{ status: "ok" }`.

## Step 5 — Model (01:25 elapsed)

**Did:** `features/clients/model/`: `TreeNode` + `normaliseCompany()` (three child keys → one
`children`, a `kind` per level), `flattenTree(root, expanded)` → `VisibleRow[]` with
`level/posInSet/setSize/hasChildren/expanded/parentId`, `expandedReducer` + `initialExpanded`
(Set-based, never mutates, returns the same reference when nothing changes),
`toChartSeries(node)` (children of the node; a leaf becomes one series of itself),
`buildStackedLayout(series, months, { height, tickCount, niceStep })` (pure vertical geometry,
ticks, scale; guards against zero data and bad options), and `findMismatches(root)` which lists
every (node, month) where the figure ≠ sum of children. 26 unit tests.

**Questions that came up:**

- Should the layout also compute x positions? The design makes columns `flex: 1` with fixed
  24px gaps, so horizontal geometry depends on the rendered width.
- Where do the web tests get the payload? Same question as in step 2.
- The Q3 mismatch test: hard-code the numbers from the prompt, or derive them?

**Decided:**

- The layout is vertical-only (`y`, `height`, ticks, scale); the renderer lays columns out with
  flexbox and draws each column in its own small SVG. No `ResizeObserver`, nothing to measure in
  jsdom, and the function stays a pure data → px mapping. Decision #37.
- A single `src/test/fixtures.ts` imports the API's `clients.json` by relative path (test-only,
  one-directional), for the same reason as in step 2: the mismatch test asserts facts about
  _that_ file.
- `findMismatches` is real (exported) code, and the test asserts its full output against the list
  from the design review — the function reproduced every number in the prompt (Company May 2024
  301 vs 279, Branch 1 Aug 2024 214 vs 216, Anna Blackwood May–Sep ±1–2) and confirmed that the
  22-unit company gap equals the gap Maria Gutierrez's suspected typo (22 → 44) would close.
  Nothing in the UI uses it yet; it is the hook for a "figures don't add up" hint later.
- The chart's column totals are the _sums of the branches_, not the company's own values, so the
  May 2024 column shows 279 while the table's Company row says 301. That is the honest rendering
  of inconsistent data (DECISIONS #18) and the test says so in words.

**Verified by:** `npm test -w apps/web` (7 files, 26 passed), `npm run typecheck`, `npm run lint`.

## Step 6 — TreeTable (02:05 elapsed)

**Did:** `shared/ui`: `Card`, `VisuallyHidden`, `ChevronIcon` (one path, rotated for "down"),
`Avatar` (initials + hue from the node id). `shared/lib`: `cn`, `formatMonth`.
`features/clients/ui/TreeTable/`: `TreeTable` (owns expanded state via `useReducer`, renders a
`<table role="treegrid">` with a hidden "Name" column header and formatted month headers),
`TreeRow` (ARIA level/posinset/setsize, `aria-expanded` only with children, chevron or a 24px
spacer so leaf branches align, avatar for advisers, 0/28/56/108px indents by kind), and
`useTreeGridKeyboard` (roving tabIndex + the full APG key map, focus follows the active row after
re-render). 17 RTL tests with `user-event` covering mouse, every key, ARIA attributes, leaves, DOM
removal of collapsed children and the keep-state-on-collapse rule. Temporarily wired the table into
`App` with the test fixture so it can be looked at in a browser — replaced in step 8.

**Questions that came up:**

- `jsx-a11y/no-noninteractive-element-to-interactive-role` fired on `<table role="treegrid">`, on
  `<th role="columnheader">` and `<th role="rowheader">`. Suppress or restructure?
- jsdom/RTL does not apply HTML-AAM's context mapping (`td` inside a treegrid → `gridcell`), so a
  test querying `gridcell` found nothing without an explicit role.
- My first "falls back to the first row" test was wrong: clicking a parent makes _it_ the active
  row before its children disappear, so the fallback path is unreachable by mouse. Rewrote the
  test to assert the real invariant (exactly one tab stop, on the clicked parent); kept the
  fallback in the hook as a cheap guard.
- A screenshot taken right after a burst of synthetic key presses showed the focus ring one row
  behind the DOM's `activeElement` — paint lag in the automation, not a bug; the DOM state and the
  RTL tests agree.
- At the pane's ~1024px the 64px minimum month column made headers collide.

**Decided:**

- Keep the pattern and disable that one rule for the `<table>` element only (with a comment: a
  table whose rows expand _is_ the treegrid pattern). Drop the redundant explicit
  `columnheader`/`rowheader` roles — native `th scope=col|row` already map to them. Keep an
  explicit `role="gridcell"` on `td` as the APG example does, so every tool sees the same role.
  Decision #38.
- Minimum month column 80px (→ table min-width 1224px at 12 months; the card scrolls below that).
  At 1440 the columns are 92px as in the design.

**Verified by:** `npm test -w apps/web` (48 passed), lint + typecheck green; in the browser at 1440:
row/header height 56, name column 264, 16/24px paddings, tabular numbers, 1px `--outline` borders,
`position: sticky` on the name cell; Tab → ↓ → → → → → → walks Company → Branch 1 (expands) →
Anna (expands) → Existing clients with a 2px focus ring on the active row.

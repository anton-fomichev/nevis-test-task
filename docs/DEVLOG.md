# DEVLOG

Chronological log of the build. One entry per step of `docs/PROMPT.md`, plus anything that went
wrong along the way. Elapsed time is wall-clock from the first command (18:48 local), taken from the commit timestamps.

## Step 1 — Scaffold (00:11 elapsed)

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

## Step 2 — Contracts (00:14 elapsed)

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

## Step 3 — API (00:17 elapsed)

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

## Step 4 — Web scaffold (00:20 elapsed)

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

## Step 5 — Model (00:23 elapsed)

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

## Step 6 — TreeTable (00:30 elapsed)

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

## Step 7 — StackedBarChart + Legend (00:35 elapsed)

**Did:** `StackedBarChart` (props: `series`, `months`, `label`, `height`, `colors`,
`formatMonth`): a CSS-grid of y-axis (26px, sticky), plot (320px, flex columns with 24px gaps and
12px end padding, one background SVG for the five dashed grid lines, one small SVG per column
inside a 4px-rounded clipped box), x labels 12px below, `Legend` 16px below that, and a
visually-hidden `<table>` with the same numbers. `seriesColor()` returns the three tokens then a
golden-angle hue walk. `Legend` is a labelled `<ul>`. Nine RTL tests: 12 × 3 segments, exact px
heights from a fixed layout (80/160/40 on a 280px stack), fills, ticks/labels, `role="img"` name,
hidden table contents, legend items, palette extension. Chart added to the temporary preview.

**Questions that came up:**

- Should the legend live inside the `role="img"` element? Inside, AT never hears the series names
  except through the hidden table.
- The top tick label ("400") was clipped: it is centred on the plot's top edge and the card's
  scroller clips vertically as a side effect of `overflow-x: auto`.
- After adding an 8px scroller padding with a matching negative margin, the plot sat 32px below
  the card top, not 24px — an inline `margin: 0` on the `<figure>` was overriding the negative
  margin.

**Decided:**

- Legend outside the image, as a real list — because it is text, and a screen-reader user should
  hear the series names where sighted users read them. Decision #39.
- 8px top padding + negative margin on the scroller (in the stylesheet, no inline styles) so the
  label has room and nothing moves.
- `role="img"` wraps the y axis, plot and x labels with `display: contents` so the grid layout is
  untouched by the extra element.

**Verified by:** `npm test -w apps/web` (57 passed), lint + typecheck green; in the browser at
1440: plot height 320, column gap 24, end padding 12, y-axis 26 wide with a 12px gap, Aug 2024
stack 280px (= 350/400 × 320), `border-radius: 4px`, first segment `rgb(178, 157, 248)`
(`--series-1`), grid stroke `rgba(20, 20, 19, 0.08)`, x labels 12px below the plot, legend 16px
below the labels; "400" fully visible after the fix.

## Step 8 — Dashboard (00:39 elapsed)

**Did:** `features/clients/api/`: `devFlagsFrom(search)` (forwards only `delay`/`fail` from the
page URL), `fetchClientsReport()` (network / non-2xx / non-JSON / contract mismatch → one
`ClientsReportError` with a sentence a user can read, server `message` surfaced when present),
`useClientsReport()` (TanStack Query, abort signal, `retry()`). `shared/ui`: `Spinner` (status
region when labelled, decorative otherwise), `ErrorState` (`role="alert"`, title, message, Retry).
`ClientsDashboard`: pending → two `aria-busy` card placeholders sized like the real cards (no
layout jump) with one announced spinner; error → message + Retry; success → chart card + table
card. `App` now renders the dashboard; the fixture-backed preview is gone. Test helpers
(`renderWithQuery`, `mockFetch`) and 8 dashboard tests with a mocked `fetch`.

**Questions that came up:**

- Error tests timed out: the hook's own `retry: 1` overrode the test QueryClient's `retry: false`.
- With `?fail=1` in the address bar, Retry re-sends the flag and fails again, so the "recovers via
  Retry" box in the definition of done could not be ticked in a browser.
- Where should the chart card's 24/16/16 padding live: on `Card` (a prop) or at the call site?

**Decided:**

- Retry policy belongs to the app's QueryClient (`retry: 1`), not the hook — tests set their own
  client, and no component carries hidden timing. Decision #41.
- `retry()` drops the forwarded dev flags and refetches, because the flags simulate a bad server
  and "try again" should show the recovery, not replay the simulation; the test asserts the two
  request URLs. Decision #40.
- Card padding at the call site via a CSS-module class; `Card` stays a dumb surface.

**Verified by:** `npm test -w apps/web` (67 passed), lint + typecheck green; in the browser:
`/` renders chart + table; `/?delay=4000` shows two busy placeholders with the status text
"Loading the clients report…"; `/?fail=1` shows the alert with "The API answered 500: Simulated
failure requested with ?fail=1." and a Retry button; clicking Retry renders the treegrid and the
alert disappears.

## Step 9 — Responsive pass (00:43 elapsed)

**Did:** Checked 375, 768 and 1440 in the built-in browser (emulated viewports) and captured
screenshots with headless Chrome driven by `playwright-core` from a scratch folder (not a project
dependency): `docs/screenshots/desktop-1440.png`, `expanded-channels-1440.png`,
`keyboard-focus-1440.png`, `mobile-375.png`, `loading-state.png`, `error-state.png`, all at 2×.

**Questions that came up:**

- At 375 the legend was centred on the chart's 763px _scroll_ width, so it sat half out of view.
- My first measurements at 375 looked wrong (name column 63px, not sticky) — I had queried the
  first `<table>` on the page, which is the chart's visually-hidden data table. Re-measured against
  `[role="treegrid"]`.
- The keyboard-focus screenshot showed the row outline cut off on the left: the sticky name cell
  (opaque, `z-index: 1`) paints above the row box and covered the outline.

**Decided:**

- Only the drawing scrolls: the legend moved out of the chart's scroller and stays centred in the
  card. The `<figure>` wraps scroller + legend + hidden table.
- The focus ring is drawn with inset `box-shadow`s on the cells (first/last cells add the side
  edges) instead of an outline on the `<tr>`, so it is complete on every row, sticky column
  included. Decision #42.
- No `ResizeObserver`/JS for responsiveness: pure CSS (`overflow-x: auto` scrollers, 180px sticky
  name column ≤ 768px, 720px minimum plot width).

**Verified by:** In the browser — 375: `document.documentElement.scrollWidth === 375`, chart
scroller 311/763 (client/scroll), table scroller 343/1140, name cell 180px and `position: sticky`,
legend centred within the card and fully in view. 768: scrollWidth 768, chart 704/763, table
736/1140, name 180. 1440: table 1376 wide with 92px month columns, no scrollers active.
`npm test -w apps/web` (67 passed), lint + typecheck green.

## Step 10 — Polish & handover (00:50 elapsed)

**Did:** Root `npm run lint && npm run typecheck && npm test && npm run build` green; the same
from a fresh `git clone` into a scratch folder (install from the lockfile → 0 vulnerabilities, lint,
typecheck, 7 + 9 + 67 tests, build) — exit 0. Coverage: contracts 100%, api 88%, web 99% lines.
Rewrote `README.md` per the prompt's section 6. Corrected the elapsed stamps on every DEVLOG entry
to wall-clock values taken from the commit timestamps (my first stamps were guesses that overstated
the time roughly fourfold — the kind of thing this log exists to catch).

**Questions that came up:**

- Keep `docs/PROMPT.md` in the repository? It is the instruction set the build followed.
- The "Time spent" section: the brief expects 6–8 hours of a person; the build was 50 minutes of
  an agent after about an hour of human design review.

**Decided:**

- Keep the prompt: it is the most honest account of how the decisions were made and what the
  agent was told. Decision #43.
- Say the real numbers in the README and describe the split (human review up front, agent for the
  typing, paper trail for both), since the brief invites LLM use and the trail is the deliverable.

**Definition of done (prompt §7):**

- [x] `npm install && npm run lint && npm run typecheck && npm test && npm run build` pass from a
      clean clone — verified in a scratch clone of the committed history.
- [x] `npm run dev` serves the dashboard; `GET /api/clients` returns `{ months, company }` with the
      payload unchanged — `app.test.ts` diffs it against the brief's JSON block.
- [x] Expand/collapse by mouse and by ↑ ↓ → ← Enter Space Home End; every row carries
      `aria-level/posinset/setsize` and `aria-expanded` where applicable — `TreeTable.test.tsx` and
      a manual walk in the browser.
- [x] Loading and error states via `?delay=2000` / `?fail=1`; Retry recovers — browser-checked and
      tested with a mocked `fetch`.
- [x] 375px: no page-level horizontal scroll, both cards scroll internally, name column sticky —
      measured in the browser, screenshot in `docs/screenshots/mobile-375.png`.
- [x] Tests cover expand/collapse (mouse + keyboard), ARIA, data → chart mapping, non-uniform
      nesting, the three fetch states and the API shape.
- [x] One DEVLOG entry per step; DECISIONS has rows 1–27 from the review and 28–43 from the build;
      README follows §6 and names Q1–Q12.
- [x] Ten commits, conventional messages, nothing pushed.

**What I would cut with less time:** the screenshots and the loading/error placeholder sizing first
(cosmetic), then the palette extension beyond three series and the `findMismatches` helper (not
visible in the UI), then the API's `?delay` flag (the error flag alone demonstrates the state
handling). The contracts package, the treegrid keyboard map and the layout unit tests would stay —
they are what the brief grades.

**Verified by:** the clean-clone run above; `git status` clean after the final commit; `git log`
shows ten commits on `master`, none pushed.

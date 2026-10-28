# One-shot build prompt — Nevis frontend take-home

> Paste everything below the line into a fresh Claude Code session opened in this repository.
> Run it with the default (not fast) model and plan mode off. Expect 1–2 hours of autonomous work.

---

You are a senior frontend engineer doing a take-home assignment for Nevis. The repo is empty except for `README.md` (the brief, copied verbatim from the PDF, including the JSON payload) and the PDF itself. Read `README.md` first. Your job is to deliver the complete, polished solution in one pass, **and** to leave a readable paper trail of every decision and open question — that trail is graded as much as the code.

The brief deliberately leaves things open. Below I have already done the design review and found the gaps; most decisions are made for you (section 3). Where you hit something new, decide, log it, move on. Never stop to ask me questions.

## 1. What you are building

A single-page dashboard "Clients": a stacked bar chart of 12 months plus a hierarchical table (Company → Branches → Advisers → Acquisition channels) with expandable rows, fed by a Node.js REST API that serves the JSON payload from the brief. React + TypeScript, accessible, tested, nothing broken down to 375px.

## 2. Design spec (extracted from Figma — you don't need Figma access)

Figma: https://www.figma.com/design/aEd0UMLuaQ0wMhxgeWXFxg/Web-engineer-home-task--Copy-?node-id=1-2781 (page "Mockups", frame "Mockup 2" 1440×900; component sets "Table · First and second levels", "Table · Third level", "Row", "Row name"). If you have the Figma MCP available you may screenshot it to double-check, but the spec here is sufficient.

### Tokens
| token | value |
|---|---|
| `--bg-page` | `#f7f5ed` |
| `--bg-card` | `#ffffff` |
| `--content-primary` | `#141413` |
| `--content-secondary` | `rgba(20,20,19,0.6)` |
| `--outline` | `rgba(20,20,19,0.08)` (row dividers, grid lines) |
| `--surface-hover` | `rgba(20,20,19,0.04)` |
| `--series-1` | `#b29df8` (legend "Existing clients") |
| `--series-2` | `#f4beb4` ("New organic") |
| `--series-3` | `#a75e6e` ("New paid") |
| radius card | 8px; bar column 4px; legend swatch 2px; avatar 50% |
| font | Inter 400. Body 14/20, footnote 12/16, title 35/1.25 (design uses "Inter Display" — use Inter). Numbers use `font-feature-settings: "tnum" 1, "lnum" 1`. |

### Page
Background `--bg-page`. Content column max 1408px, centered, 16px side gutters, 24px top padding, 16px vertical gap between title / chart card / table card. Title "Clients" (h1, 35px).

### Chart card
White card, padding 24 top / 16 sides / 16 bottom. Layout inside:
- Y axis labels (12px secondary, right-aligned, 26px wide) at 0/100/200/300/400 in the design; **compute ticks from data** (nice max = ceil(max/100)*100, 5 ticks).
- Plot area 320px tall, 12px gap to the labels; 5 horizontal dashed grid lines (`--outline`).
- 12 columns, equal width (`flex: 1`), 24px gap between columns, 12px padding at both ends of the plot. Each column is a single rounded rect (4px, all corners, overflow clipped) containing the stacked segments. Segment order bottom→top: series 1, 2, 3.
- X labels (12px secondary, centered under each column) 12px below the plot.
- Legend centered, 16px below the x labels: 8px square swatch, 4px gap, label 12px secondary, 16px between items.

### Table card
White card, radius 8, overflow hidden.
- Header row 56px, padding 16 left / 24 right, bottom border `--outline`. First column 264px wide (its header text is invisible in the design — render a visually-hidden "Name"). Then 12 month columns, each `flex: 1`, right-aligned, 14px secondary, 16px gap.
- Body rows 56px, same paddings, 14px primary, numbers right-aligned with `tnum`; bottom border on every row except the last visible one; hover background `--surface-hover` on expandable rows.
- Name cell per level (padding-left inside the 264px cell): Company 0 · Branch 28px · Adviser 56px + 20px circular avatar before the name · Channel 108px, no chevron. Chevron 16px before the name with 8px gap: points right when collapsed, down when expanded (rotate the same icon). Inline SVG, 1.5px stroke, currentColor.
- Initial state: Company expanded, everything else collapsed.

## 3. Decisions already made — apply them, and record them in `docs/DECISIONS.md`

### Architecture & tooling (fixed)
- **Monorepo, npm workspaces** (no pnpm/turbo): `apps/web`, `apps/api`, `packages/contracts`. One `npm install`, `npm run dev` at root starts both via `concurrently`; Vite proxies `/api` to the API. Node 22 (`.nvmrc`, `engines`).
- **`packages/contracts`**: zod schemas + inferred TS types for the API response. API validates its response against them in tests; web parses responses with them. This is the boundary between the two apps.
- **API: Fastify 5 + TypeScript**, run with `tsx`. `GET /api/clients` → `{ months: string[], company: CompanyNode }` where `months` are ISO `"2024-02" … "2025-01"` and `company` is the brief's payload verbatim (stored in `apps/api/src/data/clients.json`, byte-for-byte from `README.md`). `GET /api/health`. Dev-only query params `?delay=<ms>` and `?fail=1` (ignored when `NODE_ENV=production`) so loading and error states can be demoed. Document them in the README.
- **Web: Vite + React 19 + TypeScript (strict)**. Data fetching with **TanStack Query** (loading/error/retry for free, standard on real teams). No global state library — expanded-row state is local to the table (a `Set<string>` of ids in `useReducer`).
- **Styling: CSS Modules + CSS custom properties** for tokens in `app/tokens.css`. No Tailwind, no UI kit. Fonts via `@fontsource-variable/inter`.
- **Chart: hand-rolled SVG**, no charting library. The layout is a pure function `buildStackedLayout(series, months, {height, tickCount})` → segments with x/y/height, ticks, scale — fully unit-tested. Rendering is a thin component over that output. Reason: exact match to the design (clipped rounded columns, dashed grid), full control over accessibility, and the "data → chart" mapping test the brief asks for becomes trivial.
- **Testing: Vitest + React Testing Library + @testing-library/user-event + jest-dom** for web; Vitest + `app.inject()` for the API; `vitest --coverage` wired but no threshold. No Playwright (listed under "what I'd do next").
- **Lint/format: ESLint flat config** (typescript-eslint, react-hooks, jsx-a11y) + Prettier. Root scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `format`. All four checks must pass before you finish.
- **Web folder layout** (feature-first, shallow):
  ```
  apps/web/src/
    app/                 App.tsx, QueryProvider, tokens.css, global.css
    shared/ui/           Card, Avatar (initials), VisuallyHidden, ChevronIcon, Spinner, ErrorState
    shared/lib/          formatMonth(iso) → "Feb 2024", cn()
    features/clients/
      api/               useClientsReport() (TanStack Query + contracts parsing)
      model/             types.ts, flattenTree.ts (tree + expanded set → visible rows), buildStackedLayout.ts, toChartSeries.ts
      ui/                ClientsDashboard, StackedBarChart/, TreeTable/ (TreeTable, TreeRow, useTreeGridKeyboard), Legend
  ```
  Components take data and callbacks, never fetch; the dashboard composes them. Each component's props are the API you'd ship to a team: small, typed, documented with a one-line JSDoc.
- **Accessibility: WAI-ARIA treegrid.** `<table role="treegrid">`, each `<tr role="row">` carries `aria-level`, `aria-posinset`, `aria-setsize`, and `aria-expanded` only when it has children. The **row itself** is the interactive element (roving `tabIndex`, whole row clickable as in the design); the chevron is `aria-hidden`. Keyboard: ↑/↓ move between visible rows, → expands (or moves to first child if already expanded), ← collapses (or moves to parent if already collapsed), Enter/Space toggle, Home/End first/last. Collapsed children are not rendered at all. Chart: `role="img"` with an `aria-label` summarising the series, plus a visually-hidden `<table>` with the same numbers so the data reaches AT. Hover/focus styling: visible focus ring (`:focus-visible`) on rows.
- **Narrow screens (≤ 768px):** both cards get `overflow-x: auto`; the table keeps the name column sticky (`position: sticky; left: 0`) and shrinks it to 180px; the chart keeps a min plot width of 720px. Nothing wraps or overflows the viewport at 375px.
- **Node kinds**: normalise `branches/employees/channels` into one `TreeNode { id, name, kind: 'company'|'branch'|'adviser'|'channel', values, children }` at the feature boundary (`model/types.ts`), so table/chart code never knows about the three key names. Rows with no children render no chevron and are not expandable (even though the Figma shows chevrons on Branch 2/3 — see Q1).

### Open questions found in the brief/design, with the resolution to apply
Record each in `docs/DECISIONS.md` and summarise in the README "Assumptions & open questions" section.

- **Q1 — Branch 2 and Branch 3 have no employees but the mockup draws chevrons on them.** Resolution: no chevron, no `aria-expanded`, not interactive, name still indented to align with Branch 1. Flag in README as a probable design oversight.
- **Q2 — The chart legend shows acquisition channels (Existing / New organic / New paid) at company level, but only Anna Blackwood has channel data.** Stacking the company by channel would need an "Unattributed" bucket of ~90% of every bar and would hide the information. Resolution: the chart stacks the **Company by its children (Branch 1/2/3)**, legend = branch names, colours = the three series tokens (extend the palette deterministically if a node ever has > 3 children). `StackedBarChart` is data-agnostic (`series: {id, label, values}[]`), so switching to channels or to a "selected row" breakdown is a one-line change — list that as a next step. Flag clearly in README as "we think the design assumes data that doesn't exist".
- **Q3 — Children do not always sum to their parent.** Verified against the payload: Company May 2024 = 301 but branches sum to 279; Branch 1 Aug 2024 = 214 but advisers sum to 216; Anna Blackwood May–Sep 2024 differ from her channels by ±1–2. Maria Gutierrez May 2024 = 22 between 41 and 46 looks like a typo (with 44, the Company May total would reconcile). Resolution: **the API payload is the source of truth, values are displayed as given and never recomputed from children**; add a unit test that documents the mismatches (it asserts the specific known differences so the next person sees them). Flag in README with the exact numbers.
- **Q4 — The Figma mockups disagree with the payload** (Figma: Branch 1 Jul 2024 = 291, Robert Chen Aug 2024 = 56, "New paid" row order of values differs). Resolution: payload wins; mention in README.
- **Q5 — Advisers have photo avatars in the design; the payload has no avatar field.** Resolution: `Avatar` renders initials on a deterministic background derived from the node id; the API is not extended with fake image URLs. Next step: `avatarUrl?: string` on adviser nodes.
- **Q6 — Months are not in the payload** ("Feb 2024 … Jan 2025" comes from the design only). Resolution: the API returns `months` explicitly (ISO strings) next to the tree; the UI formats them with `Intl.DateTimeFormat('en-GB', {month:'short', year:'numeric'})`. The API asserts `values.length === months.length` at startup.
- **Q7 — Y-axis range.** Design hard-codes 0–400. Resolution: computed from data (see spec); the design's 400 is what the current data produces.
- **Q8 — Expand state when a parent collapses.** Resolution: children keep their expanded state (the set of ids is not pruned), so re-expanding restores the previous view. Cheap and least surprising.
- **Q9 — Whole-row click vs. a button in the name cell.** Resolution: whole row, per the design and the treegrid pattern described above. Mention the trade-off (a nested button would be more discoverable for screen-reader users who browse by form controls).
- **Q10 — Hover state on non-expandable rows.** Resolution: no hover background on leaf rows; cursor default.
- **Q11 — Which row/level is "selected" for the chart?** Not in the design. Resolution: none; see Q2.
- **Q12 — The first header cell reads "Placeholder" in white in Figma.** Resolution: visually-hidden "Name" header for AT.

## 4. Working method — the paper trail

Keep two living documents and update them **as you go, not at the end**:

1. **`docs/DEVLOG.md`** — chronological. One entry per step below, in this exact shape:
   ```
   ## Step N — <title>  (<HH:MM elapsed>)
   **Did:** …
   **Questions that came up:** … (or "none")
   **Decided:** … — because …
   **Verified by:** <command / test / manual check>
   ```
   Add entries for things that went wrong (a failing test, a wrong assumption) — do not sanitise.
2. **`docs/DECISIONS.md`** — a register, one row per decision: `| # | Area | Decision | Alternatives considered | Why | Revisit when |`. Pre-fill it with every bullet in section 3 (architecture + Q1–Q12), then append anything new.

Git: commit after every step with a conventional-commit message (`feat(web): …`, `chore: …`, `docs: …`), on the current branch. Do not push.

Move the brief out of the README: `git mv`-style, create `docs/BRIEF.md` with the current README content, then rewrite `README.md` as the project README (structure in section 6).

## 5. Steps (follow in order; each ends with a commit and a DEVLOG entry)

1. **Scaffold** — root `package.json` with workspaces, `.nvmrc`, `.editorconfig`, `.gitignore`, Prettier, ESLint flat config, root scripts; `docs/BRIEF.md`, `docs/DEVLOG.md`, `docs/DECISIONS.md` (pre-filled). Verify: `npm install && npm run lint && npm run typecheck`.
2. **Contracts** — zod schemas (`CompanyNode` with recursive `branches/employees/channels`, `ClientsReport`), inferred types, a test that parses the brief's payload. Verify: `npm test -w packages/contracts`.
3. **API** — Fastify app factory (`buildApp()`), route, data file, dev-only delay/fail params, startup assertion on months length, `app.inject` tests (200 shape, health, fail/delay flags, production ignores flags). Verify: tests + `curl localhost:3001/api/clients | head`.
4. **Web scaffold** — Vite, React, TanStack Query provider, tokens/global CSS, fonts, proxy. Renders the title on `--bg-page`. Verify: `npm run dev`, open in a browser (use the browser tooling available to you if any; otherwise `npm run build` + preview).
5. **Model** — `TreeNode` normalisation, `flattenTree(root, expanded)` → visible rows with `level/posInSet/setSize/hasChildren/parentId`, `toChartSeries(root)` (children of root), `buildStackedLayout`. Unit tests, including the Q3 mismatch test and non-uniform nesting (Branch 2/3 leaves; only Anna has channels).
6. **TreeTable** — components + `useTreeGridKeyboard`; RTL tests: click expands/collapses, children not in DOM when collapsed, all keyboard interactions above, aria attributes per row, leaf rows have no `aria-expanded`, focus moves correctly.
7. **StackedBarChart + Legend** — SVG rendering over the layout; RTL tests: 12 columns × N segments, heights proportional to values (assert a couple of exact px values from a fixed layout), legend labels/colours, `role="img"` label and hidden data table present.
8. **Dashboard** — `useClientsReport`, loading (`Spinner` inside the card placeholders, `aria-busy`), error (`ErrorState` with the message and a Retry button that refetches), success. RTL tests with a mocked `fetch` for all three states.
9. **Responsive pass** — check 1440 and 375 (and 768). Sticky name column, horizontal scroll inside cards, no page-level horizontal overflow. If you have browser tooling, save screenshots to `docs/screenshots/` (desktop, 375, expanded to channels, keyboard focus visible) and link them in the README.
10. **Polish & handover** — `npm run lint && npm run typecheck && npm test && npm run build` all green; README per section 6; final DEVLOG entry with total elapsed time and what you'd cut if you had less time.

## 6. README structure (final)

1. Title + one paragraph + screenshot.
2. **Run it** — prerequisites (Node 22), `npm install`, `npm run dev` (web on 5173, API on 3001), `npm test`, `npm run lint`, `npm run build`; the `?delay`/`?fail` dev flags with example URLs.
3. **What's where** — the monorepo map, 6–8 lines.
4. **Design decisions** — a short narrative (stack, why hand-rolled SVG, why treegrid, why contracts package), linking to `docs/DECISIONS.md`.
5. **Assumptions & open questions** — Q1–Q12 in plain language, grouped: "things we think the brief/design got wrong" (Q2, Q3, Q4, Q1) first, then the rest.
6. **Accessibility** — keyboard map, ARIA pattern, how to test with VoiceOver in two lines.
7. **Testing** — what is covered and how to run it.
8. **What I'd do next** — ordered: chart breakdown selector / row-driven chart (Q2), Playwright e2e for keyboard + 375px, avatars from API, virtualised rows for large trees, number formatting / i18n, column pinning for the current month, dark mode via the token layer, CI workflow.
9. **Time spent** — honest number from the DEVLOG.
10. Links: `docs/BRIEF.md`, `docs/DEVLOG.md`, `docs/DECISIONS.md`, Figma.

## 7. Definition of done — check every box before you stop

- [ ] `npm install && npm run lint && npm run typecheck && npm test && npm run build` pass from a clean clone.
- [ ] `npm run dev` serves the dashboard; the API returns the brief's payload unchanged plus `months`.
- [ ] Expand/collapse works by mouse and by every key listed; AT gets level/expanded/position for every row.
- [ ] Loading and error states are reachable via `?delay=2000` / `?fail=1` and the error state recovers via Retry.
- [ ] 375px: no horizontal page scroll, both cards scroll internally, name column sticky.
- [ ] Tests cover: expand/collapse (mouse + keyboard), ARIA, data→chart mapping, non-uniform nesting, the three fetch states, the API shape.
- [ ] `docs/DEVLOG.md` has one entry per step; `docs/DECISIONS.md` has every section-3 item plus whatever you added; README follows section 6 and is honest about Q1–Q12.
- [ ] One commit per step, conventional messages, nothing pushed.

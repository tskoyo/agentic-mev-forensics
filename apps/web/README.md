# @mev/web — Next.js dashboard

Next.js 15 + React 18 + Tailwind v3 + TypeScript implementation of the
MEV Forensics observability UI from `MEV Forensics Design System-handoff`.

## Run

```bash
pnpm install
pnpm --filter @mev/web dev          # http://localhost:3000
pnpm --filter @mev/web build
pnpm --filter @mev/web typecheck
```

## File layout

```
apps/web/
├── app/
│   ├── globals.css                # Tailwind + CSS-var design tokens (light + dark)
│   ├── layout.tsx                 # Root HTML, font preconnect, body styles
│   └── page.tsx                   # Server component → renders <App />
├── components/
│   └── mev-forensics/
│       ├── App.tsx                # 3-column shell, theme state, toast
│       ├── Header.tsx             # Top bar, logo, simulate-webhook, dark toggle
│       ├── WebhookToast.tsx       # Auto-dismissing toast
│       ├── primitives/
│       │   ├── VerdictBadge.tsx   # frontrun / unknown / normal / not checked / auto
│       │   ├── RoleChip.tsx       # arbitrageur / searcher / pool / builder / …
│       │   ├── Mono.tsx           # JetBrains Mono w/ tabular-nums
│       │   ├── SectionLabel.tsx   # Uppercase 10px label
│       │   └── icons.tsx          # All inline SVG icons
│       ├── sidebar/
│       │   ├── TradesSidebar.tsx  # 280px column, list + suggested follow-ups
│       │   └── TradeRow.tsx
│       ├── canvas/
│       │   ├── InvestigationCanvas.tsx
│       │   ├── BudgetMeter.tsx    # Tool-budget progress bar (green/amber/red)
│       │   ├── ToolCallRow.tsx    # done / running / pending / error styles
│       │   ├── NarrativeBlock.tsx # Headline + body + ruled-out collapse
│       │   └── PnLCard.tsx        # Expected / Realized / Gap + thresholds
│       └── evidence/
│           ├── EvidencePanel.tsx  # 340px column, verdict card, PnL summary, tabs
│           ├── ActorsTab.tsx
│           ├── TimelineTab.tsx
│           └── CitationsTab.tsx
├── lib/
│   ├── types.ts                   # Trade, Investigation, ToolCall, Pnl, Actor, …
│   ├── tokens.ts                  # Token names + cssVar() helper
│   ├── styles.ts                  # VERDICT_STYLES, ROLE_STYLES, TAG_COLORS, TOOL_STATUS_STYLES
│   ├── sample-data.ts             # TRADES + INVESTIGATIONS fixture
│   └── cn.ts                      # Tiny class-name joiner
├── package.json
├── tailwind.config.ts             # Maps Tailwind colors to CSS variables
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json                  # `@/*` path alias
└── next-env.d.ts
```

## Design tokens

All tokens live as CSS custom properties in `app/globals.css`. Light mode is
the default; dark mode is activated by `<html data-theme="dark">` (toggled by
`App.tsx` based on local state). Tailwind colors in `tailwind.config.ts` map
directly to these variables, so the theme swap is one attribute change.

| Tailwind class         | CSS var       | Light     | Dark      |
| ---------------------- | ------------- | --------- | --------- |
| `bg-canvas`            | `--canvas`    | `#F5F3EF` | `#141210` |
| `bg-surface`           | `--surface`   | `#FFFFFF` | `#1E1B18` |
| `bg-sunken`            | `--sunken`    | `#F0EDE8` | `#111009` |
| `text-text-p`          | `--text-p`    | `#1C1917` | `#F0EDE8` |
| `text-text-s`          | `--text-s`    | `#6B6460` | `#9B948F` |
| `text-text-t`          | `--text-t`    | `#9B948F` | `#6B6460` |
| `text-green` / `bg-green-bg` etc. | semantic verdict palette                                    |

## Replacing sample data with a real API

`lib/sample-data.ts` exports `TRADES` and `INVESTIGATIONS`. Wire these to
`apps/api` (Hono + SSE) by:

1. Replace the static `TRADES` import in `App.tsx` with a `useEffect` fetch
   to `GET /trades`.
2. Replace `INVESTIGATIONS[selectedId]` with state populated via SSE from
   `POST /investigate`. Each `tool_call` event appends to `inv.toolCalls`,
   each `narrative` event sets `narrativeHeadline` + `narrativeBody`, etc.
3. The `Simulate webhook` header button currently calls a local toast — point
   it at `POST /webhook/tenderly` instead to demo the KeeperHub flow.

## Why this structure

- **CSS variables, not Tailwind plugins.** The handoff design uses runtime
  token mutation (`Object.assign(TOKEN, …)`). CSS vars give the same single
  source of truth without rebuilding Tailwind on theme change.
- **Each component is its own file.** Matches the design handoff's component
  granularity (`comp-trade-row`, `comp-budget-meter`, …) and keeps PR diffs
  reviewable.
- **`"use client"` only at the boundary.** `App.tsx` and any component with
  hooks (`useState`/`useEffect`) is marked client; pure presentational
  components (`Mono`, `VerdictBadge`, `BudgetMeter`, etc.) stay server-render
  capable.

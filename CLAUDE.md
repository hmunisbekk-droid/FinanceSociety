# CLAUDE.md

WIUT Finance Society website — Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, Supabase, TypeScript. See README.md for setup and structure.

## Commands

- `bash scripts/dev.sh` — dev server with nvm's Node (plain `npm run dev` needs node on PATH).
- `npm run typecheck && npm run lint` — run both before committing; the ESLint config includes React Compiler rules (no setState in effects, no `Date.now()` in render).
- `npm run db:push` — applies new `supabase/migrations/*.sql` files to the hosted database. Never edit an applied migration; add a new timestamped file.
- `npm run seed:dev` — idempotent dev seed; test accounts and their password are at the top of `scripts/seed-dev.mjs`.

## Conventions

- Server Components fetch with `createClient()` from `src/lib/supabase/server.ts` (runs as the user; RLS applies). Use `createAdminClient()` only where the code itself enforces permissions (quiz grading, seat counts, stats) and never send its results to the browser unfiltered.
- Quiz answers must never reach the client: `toPublicQuestions()` strips them; grading happens in `submitQuiz`.
- Forms are plain `<form action={serverAction}>`; actions `redirect(withFlash(path, { ok | error }))` and pages render `<Flash>` from `searchParams`. Client components only where interaction needs state (quiz runner, question editor, uploads).
- PostgREST embeds: to-one relations come back as objects, to-many as arrays; the untyped client cannot tell — use the `one()` helpers / `Array.isArray` guards as in `src/lib/dashboard.ts`.
- Dates: store ISO/UTC; display in `Asia/Tashkent` through `src/lib/format.ts`; event form inputs are Tashkent time (UTC+5, no DST).
- Text with formulas goes through `<Prose>` / `renderMath()`; never inject editor text as raw HTML elsewhere.
- Icons: lucide-react 1.x — many older names were removed (`Instagram`, `Loader2`, `Trash2`, `Mic2`…); check `node_modules/lucide-react/dist/lucide-react.d.ts` before using a new one.
- Green and red are reserved for correct/wrong and gains/losses (ТЗ §8); brand colours are the `brand-*` / `accent-*` tokens in `globals.css`.
- A new route folder sometimes needs a dev-server restart before Turbopack sees it (it caches a 404).

## Status (7 Oct 2026)

Done: all Must requirements of the ТЗ (FR-01…03, 05…12, 15, 17…22, 26, 28, 29, 32…35, 37) plus Should items FR-13 (KaTeX), FR-14 (search), FR-16, FR-23, FR-27, FR-31, FR-36, FR-38.
Not done: FR-25 CSV question import, FR-30 confirmation/reminder emails (needs an email provider), FR-04/FR-24 (Could), Uzbek/Russian translations, Vercel deployment, GitHub push (only on the user's request).

# WIUT Finance Society website

Level-based study materials, quizzes with worked solutions and events for WIUT finance students.
Built from the ТЗ v1 (7 Oct 2026): Next.js 16 + Tailwind 4, Supabase (Postgres, auth, storage), KaTeX.

## Run it locally

```bash
npm install
cp .env.example .env.local      # then fill in the Supabase values
npm run db:push                 # applies supabase/migrations to the database
npm run seed:dev                # optional: test accounts + sample Level 5 content
npm run dev                     # http://localhost:3000
```

Node.js 24 is installed through nvm on the original dev machine (`bash scripts/dev.sh` starts the dev server with it).

### Make someone an admin

After they sign up on the site:

```bash
npm run make-admin -- person@example.com
```

Admins promote others to **editor** or **admin** in the admin panel (Users).

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript and ESLint checks |
| `npm run db:push` | Apply new files from `supabase/migrations/` (needs `DATABASE_URL`) |
| `npm run seed:dev` | Development seed (safe to re-run) — test accounts are listed in `scripts/seed-dev.mjs` |
| `npm run make-admin -- <email>` | Promote an existing account |

## Environment variables (`.env.local`)

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key — server only |
| `DATABASE_URL` | Connect → Session pooler URI (migrations only) |
| `ALLOWED_EMAIL_DOMAINS` | e.g. `students.wiut.uz` to limit sign-up; empty = anyone |
| `NEXT_PUBLIC_SITE_URL` | Public address, used in auth redirect links |

Supabase → Authentication → URL Configuration must list the site URL (and `http://localhost:3000/**` for local work).

## How it is organised

```
src/app/(site)/        public pages: home, learn/…, events/…, my, account, about, privacy, search
src/app/(auth)/        login, signup, password reset, check-email
src/app/auth/callback  email-link handler
src/app/admin/         admin panel (content, events, users, stats) — editors and admins only
src/lib/               data access (learning, events, dashboard, admin, search), auth helpers, quiz grading, KaTeX
src/components/        shared UI
supabase/migrations/   database schema, row-level security, seed of 4 levels × 6 modules
scripts/               db-push, seed-dev, make-admin, dev.sh
```

### Roles

| Role | Can |
| --- | --- |
| Guest | See home, about, events, and the list of levels and subjects |
| Student | Open topics, materials and quizzes; track progress; register for events |
| Editor | Create and edit topics, materials and quizzes in assigned subjects; submit for review |
| Admin | Everything, including publishing, subjects, events, users and statistics |

Row-level security in Postgres enforces these on every query; the app's checks are a second layer.

### Content rules

- Formulas: write LaTeX between `$…$` (inline) or `$$…$$` (own line). A `$` followed by a digit (`$5,000`) is left as money.
- Only admins can set a status to **Published**; editors set **Ready for review**.
- Files up to 20 MB (PDF, PPTX, images). Videos are links. Posters up to 5 MB.

## Before launch

- Rotate the Supabase secret key and the database password (they were shared in chat during setup).
- Set `ALLOWED_EMAIL_DOMAINS` to the WIUT student domain.
- Add an email provider (e.g. Resend) in Supabase → Authentication → SMTP; the built-in sender allows only a few emails per hour.
- Delete or re-password the `dev.*@example.com` accounts created by `seed:dev`.
- Replace the placeholder logo, colours, contacts and board members (`src/lib/site.ts`, `src/components/logo.tsx`).
- Deploy on Vercel from the GitHub repo and set the same environment variables there.

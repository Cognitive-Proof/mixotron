# Mix-O-Tron

Mix-O-Tron is an open-source [C2PA](https://c2pa.org) authoring tool for the music industry. It creates Content Credentials for original recordings, traces samples and remixes back to their sources, and carries licensing information with music as it moves into podcasts, video, and new works.

It's built as an accessible entry point for small record labels, independent artists, and music platforms adopting C2PA — a practical starting point rather than a replacement for professional DAWs or rights-management platforms.

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- [tRPC](https://trpc.io) + [TanStack Query](https://tanstack.com/query)
- [better-auth](https://www.better-auth.com) for authentication, backed by MongoDB
- [Biome](https://biomejs.dev) for linting/formatting
- [T3 Env](https://env.t3.gg) for typed, validated environment variables

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment variables

Set these in `.env` (see `.env.example`). The schema lives in `src/env.js` — if you add a new variable, update both files.

| Variable | Description |
| --- | --- |
| `BETTER_AUTH_SECRET` | Secret used by better-auth to sign sessions. Required in production. |
| `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` | Reserved for GitHub OAuth. Currently unused — email/password is the only wired-up sign-in method (see [Known gaps](#known-gaps)). |
| `MIX_O_TRON_MONGODB_URI` | MongoDB connection string. better-auth persists users/sessions/accounts here via `@better-auth/mongo-adapter`. |

If you're pointing `MIX_O_TRON_MONGODB_URI` at a Firestore MongoDB-compatibility endpoint, the service account needs the **`roles/datastore.indexAdmin`** IAM role (specifically `datastore.indexes.create`) so better-auth can create its indexes. Without it, `src/server/db/mongo.ts` catches the permission error and logs a warning instead of failing every write, but uniqueness constraints won't be enforced at the database layer until that role is granted.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run a production build. |
| `npm run preview` | Build and start, in one step. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run check` | Lint with Biome. |
| `npm run check:write` | Lint and auto-fix with Biome. |

## Project structure

```
src/
  app/
    _components/marketing/   Landing page sections (hero, features, how-it-works,
                              licensing, provenance, profiles, trust, open-source,
                              architecture) plus the nav's AuthButton
    page.tsx                 Marketing site (/)
    dashboard/                Authenticated app
      layout.tsx               Session gate — redirects to "/" if signed out
      page.tsx                 Overview; redirects to createProfile if no profiles exist
      profile/                 List, create, and edit creator profiles
      author/                  Select a profile, describe a release, drop media,
                                "produce" a Content Credential
  server/
    better-auth/              better-auth config, server session helper, React client
    db/mongo.ts                MongoDB client singleton
    api/                       tRPC routers
  styles/globals.css          Design tokens (light/dark) and all component styles
```

## Known gaps

This is a working scaffold, not a finished product. Notably:

- **Dashboard profiles are stored in `localStorage`**, not the database — they're per-browser and not tied to the signed-in account. See `src/app/dashboard/_lib/profile-store.tsx`.
- **Authoring doesn't actually produce anything.** The "Produce Content Credential" flow on `/dashboard/author` fakes a result (a random manifest ID) — no C2PA manifest is created and nothing is signed.
- **GitHub OAuth isn't wired up.** The env vars exist but `config.ts` only enables email/password.
- **Sign-O-Tron and the trust registry** (described on the marketing site) are separate services this project doesn't yet include.

## Learn more

This project was bootstrapped with [`create-t3-app`](https://create.t3.gg/). See the [T3 docs](https://create.t3.gg/) for background on the underlying stack conventions.
# mixotron

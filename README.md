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
    info/                     Music Guidance docs, including the /info/midi
                              Tone.js arranger that exports a signed .mid
    walkthrough/              Guided, no-login demo (Rights Holder audience;
                              others route to an "in progress" placeholder)
                              and the standalone /walkthrough/validator
    dashboard/                Authenticated app
      layout.tsx               Session gate — redirects to "/" if signed out
      page.tsx                 Overview; redirects to createProfile if no profiles exist
      profile/                 List, create, and edit creator profiles (MongoDB-backed)
      author/                  Select a profile, describe a release, drop media,
                                sign and embed a real C2PA manifest
      verify/                  Inspect a file's manifest, CAWG identity, DDEX
                                assertions, provenance graph, and trust-registry status
      sign/                    WebAuthn/PRF device-key signing for recognized
                                external requests (trust-registry enrollment, key-linking)
      watermark/               Embed/inspect an audiowmark watermark derived
                                from a manifest's activeManifestId
      link/                    Issue upload tokens so external tools (openDAW,
                                Audacity) can push media straight into the Author flow
  server/
    better-auth/              better-auth config, server session helper, React client
    db/mongo.ts                MongoDB client singleton
    api/                       tRPC routers (profile, manifest, watermark, link, midi)
  styles/globals.css          Design tokens (light/dark) and all component styles
```

## Known features

What's actually implemented and working, as opposed to stubbed or aspirational:

- **Authoring produces real, signed C2PA manifests.** `/dashboard/author` builds a manifest via `c2pa-rs-javascript-library` (title/description, creation origin, IPTC digital source type, `c2pa.actions`, AI-disclosure fields, up to 20 file or hash-only ingredients, optional DDEX release metadata) and embeds it in the uploaded file — nothing is faked.
- **Profiles are MongoDB-backed**, scoped to the signed-in account via tRPC (`profile.create`/`list`/`byId`), not `localStorage`.
- **Verification is real.** `/dashboard/verify` and the public `/walkthrough/validator` parse an uploaded file's manifest, CAWG identity, and DDEX assertions, render the provenance graph, and perform live TRQP trust-registry lookups (the page is explicit that identity checks hit Mix-O-Tron's own test infrastructure, not a production identity registry).
- **Device-key signing via WebAuthn/PRF.** `/dashboard/sign` recognizes and counter-signs two specific external request types — Governorator trust-registry enrollment and DIDsmith key-linking — and deliberately refuses anything it doesn't recognize.
- **Watermarking** (`/dashboard/watermark`) embeds and recovers an audiowmark watermark derived from a manifest's `activeManifestId`, with a DB record kept for recovery.
- **"Link" upload tokens** let external tools (e.g. openDAW, Audacity) push a file and ingredient hashes straight into Mix-O-Tron via a bearer-token endpoint (`/api/link/upload`), landing on a page that feeds directly into the Author flow.
- **The MIDI arranger** (`/info/midi`) is a working Tone.js step sequencer that exports a real `.mid` file with a signed C2PA manifest embedded in it.
- **The Rights Holder walkthrough** (`/walkthrough/rights-holder`) is a complete guided demo (verify → add/update manifest) with no login required.

## Known gaps

- **GitHub OAuth isn't wired up.** The env vars exist but `config.ts` only enables email/password.
- **Only the Rights Holder walkthrough audience is built out.** Recording Creator, Sample Provider, and Music Catalogue Platform all currently route to an "in progress" placeholder.
- **Sign-O-Tron and the trust registry** (described on the marketing site) are separate services this project doesn't yet include.

## Learn more

This project was bootstrapped with [`create-t3-app`](https://create.t3.gg/). See the [T3 docs](https://create.t3.gg/) for background on the underlying stack conventions.
# mixotron

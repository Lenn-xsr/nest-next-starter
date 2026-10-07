# @starter/web

Next.js (App Router) front end: sign-in, team management, account settings and
a page that showcases the design system.

## Layout

```
app/
  (auth)/login/         Google sign-in
  (app)/                authenticated shell: team, settings, design-system
  providers.tsx         React Query, theme, tooltips, Google OAuth
components/
  ui/                   base components (Radix primitives + tailwind-variants)
  app-shell.tsx         sidebar, header, sign-out
lib/
  api/client.ts         fetch wrapper: problem-document errors, transparent token refresh
  api/index.ts          endpoint functions typed with @starter/contracts
  api/hooks.ts          React Query hooks
  auth/routes.ts        redirect rules used by middleware.ts
middleware.ts           cookie-presence gate (UX only; the API authorizes)
tailwind.config.ts      design tokens: colors, typography, shadows, radii
```

## Run

```bash
cp apps/web/.env.example apps/web/.env.local   # set NEXT_PUBLIC_GOOGLE_CLIENT_ID
pnpm --filter @starter/web dev
pnpm --filter @starter/web test
```

| Variable | Notes |
| --- | --- |
| `API_URL` | Where `/api/*` is proxied to. Read at **build** time (it is compiled into the rewrite rules). Default `http://localhost:4000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same client ID the API uses. Also a build-time value |

The browser only ever calls its own origin; `next.config.mjs` rewrites `/api/*`
to the API. That keeps the auth cookies first-party.

## Design system

Tokens live in `tailwind.config.ts` and `app/globals.css` (light and dark
themes through CSS variables); components live in `components/ui`. They are
composed from parts — `<Button.Root>`, `<Button.Icon>` — and share variants
through `tailwind-variants`. Open `/design-system` in the running app for a
sample.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the origin and
license of the tokens and base components.

## Docker

```bash
# from the repository root; API_URL and the client ID are baked in at build time
docker build -f apps/web/Dockerfile \
  --build-arg API_URL=http://api:4000 \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id> \
  -t starter-web .
```

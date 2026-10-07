# @starter/api

NestJS API: Google sign-in for invited team members, server-side sessions with
rotating refresh tokens, and team management.

## Layout

```
src/
  domain/         Admin and Session entities, typed errors
  application/
    usecases/     auth (sign-in, refresh, token checks), session, admin (team)
    ports/        repositories, token signer, Google identity verifier
    dtos/         validated request bodies and documented responses
  drivers/
    mongoose/     models, mappers and repository adapters; database connection
    jwt/          HS256 signer with audience and issuer checks
    oauth/        Google ID-token verifier
    modules/      NestJS modules binding ports to adapters
  interface/      controllers, auth guard, cookies, CSRF origin check, error filter
  config/         token lifetimes
  testing/        in-memory repositories and a fake Google verifier
  app.setup.ts    HTTP setup shared by main.ts and the HTTP tests
scripts/create-admin.ts   creates the first team member
```

## Run

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env      # then fill it in
pnpm --filter @starter/api create-admin you@example.com "Your Name"
pnpm dev:api
pnpm --filter @starter/api test
```

| Variable | Notes |
| --- | --- |
| `MONGO_URI` | Required |
| `JWT_SECRET` | Required, at least 32 characters; the API refuses to start otherwise |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID; ID tokens must be issued for it |
| `ALLOWED_GOOGLE_DOMAINS` | Comma-separated; empty means nobody can sign in |
| `CORS_ORIGINS` | Web origins allowed by CORS and by the CSRF origin check |
| `TRUST_PROXY_HOPS` | Number of proxies in front of the API (default 1) |
| `PORT` | Default 4000 |
| `APP_ENV`, `APP_NAME`, `GOOGLE_CLOUD_PROJECT` | `APP_ENV=prod` enables secure cookies and Secret Manager |

Swagger UI: `http://localhost:4000/api/docs` (disabled when `APP_ENV=prod`).

## Security model in short

- Access token: 15 minutes. Refresh token: 14 days, single use, rotated on every
  refresh. Only a SHA-256 hash of the current refresh id is stored.
- Both are `httpOnly` cookies; the refresh cookie is sent only to
  `/api/auth/refresh`.
- Every authenticated request checks that the session still exists and the
  account is active, so revocation is immediate.
- State-changing requests with an `Origin` outside `CORS_ORIGINS` are rejected.

## Docker

```bash
docker build -f apps/api/Dockerfile -t starter-api .   # from the repository root
```
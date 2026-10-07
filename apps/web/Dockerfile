# Web app — build from the repository root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg API_URL=http://api:4000 \
#     --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id> \
#     -t starter-web .
FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile --filter @starter/web...

# Both values are compiled into the build: the rewrite destination for /api/*
# and the public Google client ID.
ARG API_URL=http://api:4000
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ENV API_URL=$API_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1

# Builds @starter/contracts first, then the app.
RUN pnpm --filter @starter/web... build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone output mirrors the monorepo layout and carries only the
# node_modules the server actually imports. Static assets are copied next to it.
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
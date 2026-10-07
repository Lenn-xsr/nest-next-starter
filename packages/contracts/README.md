# @starter/contracts

Types shared by the API and the web app. No runtime dependencies.

- `id` — branded string id and `createId`
- `LoggerProviderPort` — logging port implemented by `@starter/logger`
- HTTP contract: `AdminResponse`, `SessionResponse`, `MessageResponse` and
  `ProblemDetails` (the RFC 7807 error shape)

The API's mappers return these shapes and the web client is typed with them, so
changing a response is a compile error on both sides. The web app imports them
with `import type`, so nothing from this package ends up in the browser bundle.
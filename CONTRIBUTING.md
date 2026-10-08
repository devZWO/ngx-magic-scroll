# Contributing

Use Node.js 24 and pnpm 12.4.2. Run `pnpm install --frozen-lockfile`, then `pnpm e2e:install` for browser tests. System dependencies may require `pnpm e2e:install:deps`.

Keep public library code in `projects/ngx-signal-scroll/src/lib` and explicitly export the intended API through `src/public-api.ts`. Document exported symbols with TSDoc so the API reference remains current. Keep application-specific behavior in the demo.

Use strict TypeScript, standalone Angular components, signals, native control flow, and `inject()`. Unit tests use Angular's Vitest builder. Navigation and scroll behavior must be verified through the real demo with Playwright.

Before opening a pull request, run `pnpm release:check`. Run `pnpm format` on changed files. Include meaningful tests for behavior changes and update docs when the API changes.

Be respectful in issues and reviews. Contributions are submitted under this repository's MIT license. Only submit material you have the right to contribute.

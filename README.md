# ngx-magic-scroll

Anchor scrolling, URL synchronization and position restoration for Angular. **Pre-release:** the implementation is being extracted and its public API is not yet stable. No npm release has been made from this repository.

## Simplified API

Import `MagicScrollDirective` and use `<div magicScroll>` for static or resolver-loaded content.
Pass `[scrollSource]="projects"` for a signal or Angular resource; no resource adapter is needed.
All descendant IDs are anchors by default; `scrollAnchor` is optional.
`provideMagicScroll()` registers inheritable defaults for prefixes, measured headers and separate
restoration/interaction behavior. Region and per-call options can override them.

See the [library README](projects/ngx-signal-scroll/README.md) for examples and the migration guide.
Low-level scrolling and reactive helpers are internal. All four demos use the facade; their 25 existing
E2E scenarios pass unchanged in Chromium, Firefox and WebKit (75 runs).

## Workspace

- `projects/ngx-signal-scroll`: publishable `@devzwo/ngx-magic-scroll` library (the Angular project retains its original local name).
- `projects/demo`: four routed demos: document sync, navigation restoration, Material drawer with rxResource, and master–detail with document scrolling and a dynamic sticky header.
- `projects/demo/e2e`: Playwright tests.
- `docs`: Astro/Starlight documentation with API pages generated from TypeScript comments.
- `.github/workflows`: validation, GitHub Pages deployment, and npm release.

## Development

Requires Node.js 24 and pnpm 12.4.2.

```sh
pnpm install --frozen-lockfile
pnpm lib:build
pnpm start
```

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `pnpm build`            | Build library, demo, and documentation                  |
| `pnpm lib:watch`        | Rebuild library during development                      |
| `pnpm lint`             | Lint TypeScript and Angular templates                   |
| `pnpm test:ci`          | Run Vitest tests with coverage                          |
| `pnpm e2e:install`      | Download Playwright browsers                            |
| `pnpm e2e:install:deps` | Install browser system dependencies if needed           |
| `pnpm e2e`              | Run tests against the demo in Chromium, Firefox, WebKit |
| `pnpm recipes:check`    | Compile recipe TypeScript and Angular templates         |
| `pnpm docs:dev`         | Start the documentation site                            |
| `pnpm package:check`    | Build and inspect the publishable package               |
| `pnpm release:check`    | Run the complete local release validation               |
| `pnpm format`           | Format workspace files                                  |

Playwright starts the demo automatically. The scenarios check fragment synchronization, query parameter preservation, asynchronous restoration, browser back, reload, resize, drawer toggling and pagination. Library coverage is enforced at 100% per file for statements, branches, functions and lines.

## Publishing

The intended repository is `devZWO/ngx-magic-scroll`, the intended npm package is `@devzwo/ngx-magic-scroll`. See [RELEASING.md](RELEASING.md) for GitHub Pages, npm trusted publishing, version tags, and the first release.

Only `dist/ngx-signal-scroll` is published to npm; the workspace root is private. The build includes the library README and MIT license.

## Documentation

`pnpm docs:build` generates the documentation and API reference in `docs/dist`. GitHub Pages deploys the docs at `/ngx-magic-scroll/` and the demo at `/ngx-magic-scroll/demo/`.

## License

MIT, copyright 2026 devZWO GmbH. See [LICENSE](LICENSE).

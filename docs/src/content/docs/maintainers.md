---
title: Maintainers
description: Who maintains ngx-magic-scroll and how to contribute.
---

`ngx-magic-scroll` is developed and maintained by devZWO GmbH. The library focuses on coordinating anchor scrolling, Angular Router navigation and changing content through a small, declarative API.

## About devZWO

devZWO GmbH is a software engineering and consulting company developing business applications. The company also supports teams through Angular coaching and technical consulting.

Learn more on the [devZWO website](https://devzwo.com) or explore projects on [GitHub](https://github.com/devZWO).

## Contributing

Contributions are welcome, whether you want to fix a bug, improve documentation or discuss a feature. Start with the [repository](https://github.com/devZWO/ngx-magic-scroll) and read the [contribution guide](https://github.com/devZWO/ngx-magic-scroll/blob/main/CONTRIBUTING.md) before opening a pull request.

For larger changes, open an issue first to discuss the use case and proposed approach. Keep pull requests focused, describe the resulting behavior and link any related issues. Include meaningful tests for behavior changes and update documentation when the public API changes.

## Reporting issues

Open a [GitHub issue](https://github.com/devZWO/ngx-magic-scroll/issues) for bugs or feature requests. For a bug, include:

- A minimal reproduction and steps to reproduce it.
- Expected behavior and actual behavior.
- Angular and library versions, plus the browser and version.
- The affected layout: document or nested scrolling, sticky headers and asynchronous content where relevant.
- The initial URL fragment and navigation steps if the issue involves restoration.

For a feature request, describe the application use case and the behavior you need.

## Local development

Use Node.js 24 and pnpm 12.4.2, as configured in the repository. Fork and clone the repository, then run these commands from its root:

```bash
pnpm install --frozen-lockfile
pnpm lib:build
pnpm start
```

The Angular demo runs at `http://localhost:4200`. Use `pnpm lib:watch` in a separate terminal to rebuild the library as you work, or `pnpm docs:dev` to work on the documentation.

The workspace contains:

- `projects/ngx-signal-scroll`: the library source and public exports. The Angular project retains its original local name; the npm package is `@devzwo/ngx-magic-scroll`.
- `projects/demo`: runnable examples for checking scroll and navigation behavior.
- `projects/demo/e2e`: Playwright browser tests.
- `docs`: Astro/Starlight documentation, with API pages generated from TSDoc comments.

Keep library behavior in the library and application-specific examples in the demo. Use strict TypeScript, standalone Angular components, signals, native control flow and `inject()`. Document public exports with TSDoc so the generated API reference stays current.

## Validating changes

Unit tests use Angular's Vitest builder. Scroll and navigation changes also need verification in the real demo with Playwright.

```bash
pnpm lint
pnpm test:ci
pnpm e2e:install
pnpm e2e
```

Playwright runs the demo in Chromium, Firefox and WebKit. If your system is missing browser dependencies, use `pnpm e2e:install:deps`.

Run `pnpm recipes:check` when editing recipes. Complete TypeScript examples marked with `<!-- recipe-check: filename.ts -->` are compiled directly from Markdown with strict Angular template checks. Data-source integration tests use real resources, NgRx stores and TanStack queries with controlled test data; they require no backend.

Format changed files with Prettier and run `pnpm release:check` before opening a pull request. This command runs the complete validation, including builds, browser tests and package checks. See the [contribution guide](https://github.com/devZWO/ngx-magic-scroll/blob/main/CONTRIBUTING.md) for the full requirements.

## Project philosophy

- Keep the public API small and declarative.
- Integrate with Angular Router, signals and resources.
- Use stable anchor IDs to preserve navigation across data and layout changes.
- Verify browser behavior through realistic examples.

Release and hosting procedures are documented separately in [RELEASING.md](https://github.com/devZWO/ngx-magic-scroll/blob/main/RELEASING.md).

## License

`ngx-magic-scroll` is released under the [MIT License](https://github.com/devZWO/ngx-magic-scroll/blob/main/LICENSE). Contributions are submitted under the same license; only submit material you have the right to contribute.

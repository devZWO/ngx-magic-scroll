---
title: Maintainers
---

## One-time setup

1. Create a public GitHub repository `devZWO/ngx-magic-scroll` and push this workspace including `pnpm-lock.yaml`.
2. Enable GitHub Pages with **GitHub Actions** as the source. Run the `Deploy documentation` workflow; it publishes docs and the demo together.
3. Ensure you have permission to publish under the `@devzwo` npm scope. For the first publish, authenticate locally with `npm login`, build with `pnpm package:check`, and run `npm publish ./dist/ngx-signal-scroll --access public`. Perform this only when the code and API are ready to release.
4. In npm package settings, configure a GitHub Actions trusted publisher: owner `devZWO`, repository `ngx-magic-scroll`, workflow filename `publish.yml`, environment `npm`. Allow direct publishing. Create the GitHub environment `npm`; protection rules/reviewers are optional.
5. Configure default-branch protection to require the `Validate` and `Browser tests` jobs. No long-lived npm token is needed for subsequent trusted releases.

See https://docs.npmjs.com/trusted-publishers/ for npm's current setup requirements. Trusted publishing needs npm CLI >=11.5.1; the workflow uses npm 11 on Node.js 24.

The repository name/owner, documentation URL, package metadata, and npm trusted publisher must agree. If these intended names change, update all of them before publishing.

## Each release

1. Finalize the API, meaningful tests, and documentation. Review extracted code before publishing.
2. Update the version in `projects/ngx-signal-scroll/package.json` and add a changelog entry. The private workspace version is not the release version.
3. Run `pnpm release:check` and commit changes.
4. Create a GitHub release with a tag exactly matching the library version, e.g. `v0.0.1`. Mark experimental releases as pre-releases.
5. `publish.yml` validates, builds, checks the tag against the built package version, then publishes **only** `dist/ngx-signal-scroll`. Prereleases use npm's `next` dist-tag; stable releases use `latest`.
6. Check the npm package and GitHub Pages deployment. A published npm version cannot be overwritten; publish a new version for fixes.

## Build outputs

- `dist/ngx-signal-scroll`: Angular package with ESM, type declarations, README, and LICENSE.
- `dist/demo/browser`: production demo.
- `docs/dist`: generated documentation; Pages adds the demo under `demo/`.

The Pages workflow also copies the demo entry to `demo/404.html`; GitHub Pages still cannot directly serve arbitrary deep Angular routes. Use hash-based demo routing or add a reviewed SPA fallback when the real navigation demo is implemented.

No remote repository, Pages deployment, or npm publication is performed by the local setup.

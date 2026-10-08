# Changelog

## Unreleased

- Add configurable options to the existing scrolling demos without adding routes.
- Keep effect helpers out of the public API; remove the unused `effectIf` implementation.
- Apply scroll offsets in a single container-scoped scroll operation, including smooth scrolling.
- Honor reactive debounce inputs and prefix filtering during resize restoration.

- Establish Angular library/demo workspace, pnpm builds, Vitest and Playwright validation.
- Add Astro/Starlight documentation and generated API reference.
- Prepare GitHub Pages and npm trusted publishing workflows.
- Existing scroll implementation is under review; first public release pending.

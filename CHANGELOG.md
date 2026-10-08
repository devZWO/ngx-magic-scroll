# Changelog

## Unreleased

- Add the `magicScroll` facade with automatic scroll-container detection, URL sync, initial restoration, data/resize preservation and header measurement.
- Add inheritable `provideMagicScroll` defaults, region/action overrides and separate restoration/interaction behavior.
- Accept signals, plain input data, Angular resources and provider-neutral data sources directly; keep source adapters internal.
- Make anchor markers optional and add `scrollAnchor` for explicit IDs outside configured prefixes; scope nested regions independently.
- Migrate all four demos to the facade while preserving all 25 existing E2E scenarios unchanged.
- Restrict the public API to the facade and its consumer-facing types; keep low-level services, directives and reactive helpers internal. Extend the internal anchor provider for scoped anchors and explicit scroll containers.

- Add configurable options to the existing scrolling demos without adding routes.
- Keep effect helpers out of the public API; remove the unused `effectIf` implementation.
- Apply scroll offsets in a single container-scoped scroll operation, including smooth scrolling.
- Honor reactive debounce inputs and prefix filtering during resize restoration.

- Establish Angular library/demo workspace, pnpm builds, Vitest and Playwright validation.
- Add Astro/Starlight documentation and generated API reference.
- Prepare GitHub Pages and npm trusted publishing workflows.
- Existing scroll implementation is under review; first public release pending.

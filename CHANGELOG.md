# Changelog

## Release v1.1.0

- Add opt-in `preserveOnLayoutChange` configuration option to maintain section-relative scroll positions during asynchronous layout reflows (e.g., accordions, lazy images, form expansions).
- Preserve section-relative pixel displacement (`displacement`) across automatic layout corrections and data updates to keep the reader's exact reading position intact.
- Add accessible focus management (`focus: true`) to `scrollTo()` with temporary `tabindex="-1"` handling and completion coordination for smooth scrolling.
- Optimize layout reflow tracking using region-scoped `ResizeObserver` and `requestAnimationFrame` coalescing to prevent layout thrashing.
- Guard against scroll interruptions by deferring layout preservation during active smooth scrolling and skipping redundant sub-pixel (`< 1px`) scroll adjustments.
- Update demo application with layout preservation controls, accordion examples, accessible navigation toggles, and refreshed architecture documentation.

## Release v1.0.0

- Handle subsequent Angular router fragment navigations automatically after initial page load without requiring consumer coordination.
- Queue pending scroll targets and retry navigation via `MutationObserver` until asynchronous data and matching DOM elements are rendered.
- Tag scroll-spy navigation origins to distinguish internal fragment updates from external navigation and prevent navigation loops.
- Support browser history navigation (back/forward popstate) with scroll position restoration while preserving custom router history state.
- Support multiple anchor prefixes via `anchorPrefixes` array configuration.
- Add strict explicit anchor selection mode (`explicitOnly`) to restrict anchor resolution exclusively to `[scrollAnchor]` directives.
- Add parameter help tooltips and interactive anchor strategy toggles to the demo application.
- Integrate Mermaid architecture and lifecycle flow diagrams into the documentation.
- Add mascot branding in demo header and update favicons across docs and demo app.
- Expand test matrix and Playwright configuration with dedicated per-browser test suites.

## Pre-Release v0.0.1-rc.2

- Cancel pending initial scroll restoration on user interaction (wheel, touch, navigation keys) prior to data readiness, while ignoring inputs in editable elements.
- Ensure programmatic `scrollTo()` continues to work as expected after user interruption.
- Track visible live sections in real time so position preservation during asynchronous data updates or resizing targets the current reading position.
- Keep the currently read section active in the scroll-spy until the next section begins, prioritizing fully contained sections within the reading area.
- Add `bottomOffset` and `activationThreshold` configuration options for granular control over active reading boundaries and trigger lines.
- Improve server-side rendering (SSR) resilience when `ResizeObserver` or `defaultView` is not available.
- Add active zone overlay in demo application to visualize active boundaries and exclusion zones.

## Pre-Release v0.0.1-rc.1

The first public release is pending. The public API is still under review and may change before release.

The current feature set includes:

- Anchor scrolling through `magicScroll`, with automatic scroll-container detection, configurable offsets and header measurement.
- URL synchronization and initial scroll-position restoration.
- Scroll-position preservation when data or container dimensions change.
- Inheritable defaults through `provideMagicScroll`, with overrides per region or action and separate behavior for restoration and user interaction.
- Support for signals, plain input data, Angular resources and provider-neutral data sources.
- Optional anchor markers, explicit IDs through `scrollAnchor` and independent scoping for nested scroll regions.

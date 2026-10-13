# Changelog

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

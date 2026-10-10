# Changelog

## Unreleased – Initial release

The first public release is pending. The public API is still under review and may change before release.

The current feature set includes:

- Anchor scrolling through `magicScroll`, with automatic scroll-container detection, configurable offsets and header measurement.
- URL synchronization and initial scroll-position restoration.
- Scroll-position preservation when data or container dimensions change.
- Inheritable defaults through `provideMagicScroll`, with overrides per region or action and separate behavior for restoration and user interaction.
- Support for signals, plain input data, Angular resources and provider-neutral data sources.
- Optional anchor markers, explicit IDs through `scrollAnchor` and independent scoping for nested scroll regions.

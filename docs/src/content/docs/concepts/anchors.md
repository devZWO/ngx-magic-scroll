---
title: Anchors and navigation
---

Stable HTML IDs identify sections independently of their pixel positions. `magicScroll` manages a region's URL fragment, selected scroll container and anchor restoration. URL updates use `replaceUrl` and preserve query parameters.

## Anchor selection and scope

Without a prefix, all descendant IDs participate. `anchorPrefix` restricts automatic selection; setting it to `''` locally clears an inherited prefix. Optional `scrollAnchor` markers participate even outside the prefix. `[scrollAnchor]="id"` also sets the element's ID.

Targets belong to their closest `magicScroll` region. A parent region excludes anchors owned by nested regions. IDs must be unique across the document. A scrollable host, scrollable ancestor or document can own scrolling.

## Data readiness

Omitting `scrollSource` restores once after the first rendered DOM, which covers static content and resolver-loaded data. A supplied signal, plain input value or provider source waits while data is null/undefined or loading. Empty arrays, zero, false and empty strings count as ready.

Angular resources use their `isLoading()`, `hasValue()` and `value()` state; an error with no value cannot trigger restoration. Retrying and rendering error states belong to the application. Neutral sources expose reactive `data()` and `isLoading()` getters. For signal forms, pass the value signal (e.g. `form().value`), not the field tree itself.

Initial restoration captures the fragment when the region is created and runs once when its source is ready. If the target is missing at that first ready render, it does not retry initial restoration later. Missing or unknown fragments do not initiate a scroll or rewrite the URL.

## Scroll causes and defaults

The default `behavior.restoration` is `instant`; it applies to navigation, reload and the first asynchronous load. The default `behavior.interaction` is `smooth`; it applies to `scroll.scrollTo(id)`. Provider defaults are inherited, then overridden by region `scrollOptions`, then by per-call options.

Later data changes preserve the current fragment, rather than the initial fragment, and use instant corrections when the target's top edge is no longer visible. Resize and header-height changes also correct instantly. `restoreOnDataChange` and `preserveOnResize` can disable data and resize/header corrections respectively. Header measurement follows the configured header automatically with a `ResizeObserver`.

`headerOffset` is the gap below the measured header (or the entire offset without a header). `scroll.offset()` exposes the total; `scroll.headerHeight()` exposes the header measurement for sticky master panels. Per-call `topOffset` overrides the entire offset.

Visibility rules are unchanged: `none` always scrolls, `top` skips when the top edge is visible, `full` skips when both edges are visible and `always` skips when at least one edge is visible. An oversized target with both edges outside the viewport still scrolls for `always`.

## Migration and verification

The facade reuses the internal scroll service, anchor provider, scroll-parent detection and route-fragment synchronization. These implementation details and the former automatic directives are no longer package exports. Migrate their uses to `magicScroll`, `scrollOptions` and `scroll.scrollTo()`; use `scroll.activeAnchor()` for the current fragment.

All four demos use the facade. Their 25 existing browser scenarios pass unchanged across Chromium, Firefox and WebKit. New facade contracts (source normalization, provider inheritance, optional anchors and scoped targets) have separate unit tests. Complete unit coverage does not imply that every possible application layout has been tested.

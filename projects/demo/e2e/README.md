# E2E behavior contract

The tests verify public demo interactions, DOM geometry and URLs. They do not access Angular components or internal services. These expectations remain the behavior contract during API simplification; new features receive additional scenarios.

## Running the tests

```sh
pnpm run e2e:install
pnpm run e2e:install:deps
pnpm run e2e
```

The suite runs in Chromium, Firefox and WebKit. The demo server uses port 4200 by default. Outside CI, Playwright can reuse an existing server, which must serve the current library and demo.

## Verified behavior

- Document: URL and anchor synchronization, preserved query parameters and history, prefix filtering on/off, debounce with a virtual clock, mouse wheel and keyboard input, first/last anchors and scroll limits.
- Scroll service: actual intermediate positions during `smooth` scrolling, immediate jumps with `instant` even when CSS specifies `scroll-behavior: smooth`, CSS-dependent `auto`, offsets and unchanged outer scroll position.
- Visibility rules: four modes for fully visible targets, each visible edge, targets above/below the viewport, and oversized targets with both edges outside. Skipping and actual movement are verified separately.
- Navigation: data unavailable before rendering, initial restoration, Back/Forward, explicit return links, reload, UI options and history, no repeated initial restoration after a later reload, leaving during loading, missing/unknown fragments, empty lists and errors followed by a successful retry.
- Resize: a controlled shift in a preceding section with browser scroll anchoring disabled; the anchor is demonstrably displaced before resize and aligned afterward. The header demo also verifies expanding/collapsing the header and a narrower layout.
- Material Drawer: initialization, detail navigation, pagination, reload, closing/opening, scroll spy with mouse wheel input, and insertion above the active anchor. Disabling restoration provides a negative control for insertion.
- Master–detail: independent master and document scrolling in both directions, a dynamically measured header offset, restoration, and active navigation after actual mouse wheel scrolling.

All tests fail on uncaught browser errors and `console.error`. Container alignment and offsets permit less than two pixels of deviation; measured header alignment permits less than three pixels. These small tolerances account for container borders and browser rounding.

The `always` visibility rule follows the current contract: at least one element edge must be visible. An oversized element covering the viewport, with both edges outside it, therefore still triggers scrolling.

The header demo uses the facade's automatic header measurement and size observation. Its test verifies their interaction with document scrolling; the independent navigation test verifies correction after window resize with a demonstrable layout shift. Existing E2E test behavior expectations are retained when migrating to the facade. Text selectors follow the demo's English wording. The suite does not replace unit tests or claim exhaustive verification of every possible layout or future data source.

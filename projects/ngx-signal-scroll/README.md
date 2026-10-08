# @devzwo/ngx-magic-scroll

Angular signal utilities for anchor scrolling and navigation.

**Pre-release:** extracted implementation under review. The API and dependency surface may change before a stable release.

## Requirements

Angular 22.2 and RxJS 7.8. Current integrations also require ngxtension 7 and Angular signal generators 4; see `peerDependencies` for precise ranges.

## Example

```ts
import { inject } from '@angular/core';
import { ScrollService } from '@devzwo/ngx-magic-scroll';

const scroll = inject(ScrollService);
scroll.scroll('details', { topOffset: 64 });
```

Call `inject` in an Angular injection context and ensure the target HTML element exists before scrolling. `NearestAnchorProvider` requires explicit provider registration. Router helpers require Angular Router.

[Documentation and API](https://devzwo.github.io/ngx-magic-scroll/) · [Source and issues](https://github.com/devZWO/ngx-magic-scroll)

MIT, copyright 2026 devZWO GmbH.

## Asynchronous data without provider dependencies

Both data directives accept `ScrollDataSource`: reactive `data()` and `isLoading()` getters.
With Angular `rxResource`:

```ts
readonly resource = rxResource({ stream: () => this.api.loadItems() });
readonly scrollSource = {
  data: () => this.resource.value(),
  isLoading: this.resource.isLoading,
};
```

```html
<div [appScrollingOnFirstData]="scrollSource" [appScrollingOnDataChange]="scrollSource">
  <!-- Render items with stable IDs matching the route fragment. -->
</div>
```

TanStack query results satisfy this structural contract without any library dependency.
For Supabase, store response data and loading state in Angular signals and pass those
signals as the getters. The library handles scrolling; fetching, errors, pagination and
caching remain the application's responsibility. Reading the data getter must be safe
in loading/error states (guard `resource.value()` when your resource may throw).

## Demo and verification

`/document` demonstrates scroll-to-fragment synchronization; `/navigation` restores
after asynchronous loading, detail navigation, browser back, reload and resize.
`/drawer` uses Material `mat-drawer-container`, expandable application cards and
`rxResource` pagination, inspired by `AntraegeUebersichtContainer`. Its `count` query
parameter restores previously loaded pages. All demo data is synthetic.

`pnpm test:ci` enforces 100% statements, branches, functions and lines for every
library implementation file, including files without tests. `pnpm e2e` builds the
library and exercises the four examples in Chromium, Firefox and WebKit.

`/master-detail` presents a separately scrolling sticky project index next to full-length
project details that scroll the document. A sticky header changes height via a toolbar
button and responsive wrapping. `injectedHeaderHeight()` measures it; a `ResizeObserver`
updates offsets for scrolling, initial restoration and resize restoration. Scroll spy
uses `headerSelector` and `headerOffset` to match the same visible top edge. Without a
scrollable ancestor it listens to document scroll events.

The existing demos include collapsible options instead of separate examples for every feature:

- Document: instant/smooth/auto behavior, offsets, visibility rules, debounce delay and anchor-prefix filtering.
- Navigation: initial restoration behavior and offset, preserved in URL query parameters across back navigation and reload.
- Drawer: behavior and offset for data updates; prepend cards and compare restoration enabled/disabled. Browser scroll anchoring is disabled here so the difference is visible.

Reactive effect helpers are implementation details and cannot be imported from the package.
The unused `effectIf` helper was removed; `effectSkipFirstIf` remains internal.
The wider API simplification is intentionally deferred.

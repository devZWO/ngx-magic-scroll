# @devzwo/ngx-magic-scroll

Anchor scrolling, URL synchronization and position restoration for Angular.

**Pre-release:** the API is still under review. Requires Angular 22.2 and RxJS 7.8. Internal integrations use Angular's experimental `debounced` API; see `package.json` for precise ranges.

## Minimal usage

Import `MagicScrollDirective` in your standalone component. Angular Router must be provided by the application.

```html
<div magicScroll>
  <section id="project-1">...</section>
  <section id="project-2">...</section>
</div>
```

All descendant IDs participate by default. The directive finds the scroll container automatically, including a scrollable host or the document. It synchronizes the URL fragment while scrolling and restores an initial fragment once after rendering. This is enough for static content or data already loaded by a router resolver.

For asynchronous content, pass the source directly:

```ts
readonly projects = rxResource({ stream: () => this.api.loadProjects() });
```

```html
<div magicScroll [scrollSource]="projects">
  @for (project of projects.value(); track project.id) {
  <section [id]="'project-' + project.id">...</section>
  }
</div>
```

The application renders its loading/error states; when a resource can fail, guard `value()` with `hasValue()` in the template. The facade handles this guard internally for scroll readiness.

## Defaults and overrides

Register defaults in `app.config.ts` or a component's providers:

```ts
provideMagicScroll({
  anchorPrefix: 'project-',
  headerSelector: '.app-header',
  headerOffset: 16,
  behavior: { restoration: 'instant', interaction: 'smooth' },
});
```

The header's height is measured and observed automatically. `headerOffset` is an additional gap below it, or the full offset without a header. Defaults are an empty prefix and header selector, zero offset, a 500 ms scroll-spy debounce, instant restoration and smooth interaction.

Child providers inherit unspecified settings. Override an individual region with `[scrollOptions]="options"`; unspecified fields still inherit. Explicit `0`, `false` and `anchorPrefix: ''` override inherited values.

```html
<div
  magicScroll
  #scroll="magicScroll"
  [scrollSource]="projects"
  [scrollOptions]="{ headerOffset: 24 }"
>
  ...
</div>
<button (click)="scroll.scrollTo('project-2')">Project 2</button>
```

`scrollTo()` is a deliberate user action and returns whether scrolling was executed. Per-call `behavior`, `topOffset` (the full offset) and `ignoreWhenInView` override the region defaults. `scroll.activeAnchor()` exposes the current fragment for navigation highlighting; `scroll.headerHeight()` and `scroll.offset()` can position a sticky companion panel.

Navigation, reload and the first successful asynchronous load use `behavior.restoration`. Later data changes and resize/header corrections adjust instantly to stabilize the layout. `restoreOnDataChange: false` and `preserveOnResize: false` opt out of data corrections and resize/header corrections respectively. Visibility rules are: `none`, `top`, `full` and `always` (at least one edge visible).

## Optional explicit anchors

No marker is needed for normal IDs. An explicit anchor participates even outside the configured prefix:

```html
<section id="overview" scrollAnchor>...</section>
<section [scrollAnchor]="'project-' + project.id">...</section>
```

The second form sets the ID as well. Targets are restricted to their own `magicScroll` region; nested regions own their own anchors. IDs must be unique in the document.

## Supported data sources

`scrollSource` accepts signals (including computed, writable, input and model signals), Angular `resource`/`rxResource`, a signal containing a resource, and plain input values. For signal forms, pass the field's value signal, such as `form().value`; no Angular Forms dependency is needed.

A supplied source waits while it is loading or its data is `null`/`undefined`. Empty arrays, `0`, `false` and empty strings are ready values. Omitting the input means static content; explicitly binding an initially undefined value waits for data. Once the first ready render has been handled, a missing target is not retried as a second initial restoration.

The neutral `ScrollDataSource` contract remains available:

```ts
readonly source = { data: this.items, isLoading: this.loading };
```

Reactive getters must read signals. TanStack query results can satisfy this contract without a package dependency. Supabase responses can be stored in data/loading signals and exposed with the same contract. Fetching, errors, pagination and caching stay with the application; a bare Supabase client or Promise is not a loading-state adapter.

## Public API and migration

The package exports `MagicScrollDirective`, `ScrollAnchorDirective` and `provideMagicScroll`,
plus the consumer-facing types `MagicScrollOptions`, `MagicScrollToOptions`, `ScrollSource`,
`ScrollResource` and `ScrollDataSource`. Low-level services, automatic directives, configuration
internals and reactive helpers are implementation details and cannot be imported from the package.

Replace the former combination of scroll-spy, first-data, data-change and resize directives with
`magicScroll`. Pass the resource instead of a resource adapter, move options to
`provideMagicScroll`/`scrollOptions`, and use `scroll.scrollTo()` instead of locating a scroll
container manually. The existing scroll implementation remains internal to the facade.

## Demo and verification

Four routed examples demonstrate document synchronization, asynchronous navigation restoration, Material `mat-drawer-container` with pagination, and master–detail document scrolling with a measured sticky header. Options are presented inside these demos.

`pnpm test:ci` enforces 100% statements, branches, functions and lines per library implementation file. The existing 25 E2E scenarios remain unchanged after the migration to the facade and pass in Chromium, Firefox and WebKit (75 runs).

[Documentation and API](https://devzwo.github.io/ngx-magic-scroll/) · [Source and issues](https://github.com/devZWO/ngx-magic-scroll)

MIT, copyright 2026 devZWO GmbH.

Two internal helpers are adapted from ngxtension 7.3.1 under the MIT license. See [THIRD_PARTY_NOTICES.txt](./THIRD_PARTY_NOTICES.txt) for their origin, local changes and original license.

Production builds retain the original MIT notice in the JavaScript bundle for license extraction. Applications redistributing this code must retain its copyright and license notices, including when minifying or rebundling it.

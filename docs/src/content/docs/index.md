---
title: ngx-magic-scroll
description: Anchor scrolling, URL synchronization and position restoration for Angular.
---

`ngx-magic-scroll` keeps Angular pages with multiple sections connected to their URL. It tracks the current anchor while scrolling, restores linked sections when opening a page and preserves their position as content or layout changes.

## Why ngx-magic-scroll?

A scroll spy tells you which section is visible. In an Angular application, you also need to coordinate navigation, asynchronously loaded content, scroll containers and sticky headers. A link to a section should still reach that section after its data loads, and a changing header should not cover it.

`ngx-magic-scroll` brings these behaviors together in one directive:

- **Shareable section links:** synchronize the active anchor with Angular Router's URL fragment and restore it on navigation or reload.
- **Ready for asynchronous content:** pass a signal, `resource` or `rxResource` directly so initial restoration waits for the content to render.
- **Automatic scroll containers:** use a scrollable host, ancestor or the document without locating the container yourself.
- **Position preservation:** correct the current anchor's position after data changes, resizing or changes to a measured header's height.

Use it for long detail pages, asynchronously loaded lists or master–detail views where scrolling and navigation should stay in sync. You can also expose the active anchor to highlight your own navigation.

## Start with one directive

Import `MagicScrollDirective` from `@devzwo/ngx-magic-scroll` in your component's `imports`, then add it around sections with unique IDs:

```html
<div magicScroll>
  <section id="overview">Overview...</section>
  <section id="details">Details...</section>
</div>
```

With Angular Router provided, this is enough for static content: the directive detects the scroll container, updates the fragment while scrolling and restores a link such as `#details` after rendering. For asynchronously loaded content, add `[scrollSource]="yourSignalOrResource"`.

## Documentation

- [Getting started](./getting-started/): installation and your first scroll region.
- [Concepts](./concepts/): understand scroll regions, URL state, data readiness and position preservation.
- [Recipes](./recipes/scroll-to-anchor/): explore navigation, data sources and layouts through focused code examples.
- [API reference](./api/readme/): directives, options and supported data sources.
- [Live demo](./demo/): explore document scrolling, asynchronous restoration, Material Drawer and master–detail layouts.

The library is currently **pre-release**, and its public API is still under review.

## Maintained by devZWO

`ngx-magic-scroll` is developed and maintained by devZWO GmbH and released under the MIT license.

Learn more about [devZWO](https://devzwo.com) or visit the [GitHub repository](https://github.com/devZWO/ngx-magic-scroll) for source code, feedback and issues.

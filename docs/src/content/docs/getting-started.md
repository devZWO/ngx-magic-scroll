---
title: Getting started
---

## Local development

Use Node.js 24 and pnpm 12.4.2 (pinned in the root `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm lib:build
pnpm start
```

The demo runs on `http://localhost:4200`. Start these docs with `pnpm docs:dev`.

The intended npm package is `@devzwo/ngx-magic-scroll`. It has not yet been published from this repository. The current source requires Angular 22.2, RxJS, ngxtension and Angular signal generators; inspect the library's `package.json` for supported peer dependency ranges.

## One directive for the common case

```ts
import { Component } from '@angular/core';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [MagicScrollDirective],
  template: `<div magicScroll>
    <section id="project-1">...</section>
    <section id="project-2">...</section>
  </div>`,
})
export class Projects {}
```

Provide Angular Router in your application. All descendant IDs participate. The directive chooses the scroll container, synchronizes the URL fragment and restores a saved fragment after the first render. Static or resolver-loaded data requires no `scrollSource` input.

## Asynchronous loading

```ts
readonly projects = rxResource({ stream: () => this.api.loadProjects() });
```

```html
<div magicScroll [scrollSource]="projects">
  @if (projects.hasValue()) { @for (project of projects.value(); track project.id) {
  <section [id]="'project-' + project.id">...</section>
  } }
</div>
```

Pass a signal, `resource`/`rxResource`, a signal containing a resource, plain input data or reactive `data()`/`isLoading()` getters. The library waits for ready data before initial restoration. It has no TanStack or Supabase dependency.

## Application defaults

```ts
import { provideMagicScroll } from '@devzwo/ngx-magic-scroll';

providers: [
  provideMagicScroll({
    anchorPrefix: 'project-',
    headerSelector: '.app-header',
    headerOffset: 16,
    behavior: { restoration: 'instant', interaction: 'smooth' },
  }),
];
```

Providers can be registered globally or per component; child providers inherit unspecified defaults. The header height is measured automatically. Override individual regions using `scrollOptions`. See [Anchors and navigation](../concepts/anchors/) for readiness and restoration semantics.

Public runtime imports are `MagicScrollDirective`, `ScrollAnchorDirective` and `provideMagicScroll`. The facade manages its own internal providers. Its option and source types are also exported; low-level services, directives and reactive helpers are internal.

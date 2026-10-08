---
title: Scroll to an anchor
---

Import `MagicScrollDirective`, assign stable IDs, and export the directive in the template:

```ts
import { Component } from '@angular/core';
import { MagicScrollDirective, provideMagicScroll } from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [MagicScrollDirective],
  providers: [provideMagicScroll({ anchorPrefix: 'project-' })],
  template: `
    <button (click)="scroll.scrollTo('project-details')">Show details</button>
    <div magicScroll #scroll="magicScroll">
      <section id="project-details"><h2>Details</h2></section>
    </div>
  `,
})
export class Example {}
```

The facade finds the scroll container and uses the configured interaction behavior. `scrollTo()` returns false when the target is absent, belongs to another region, does not match the prefix or is skipped by a visibility rule.

## Explicit anchor outside the prefix

Import `ScrollAnchorDirective` as well:

```html
<section id="overview" scrollAnchor>Overview</section>
<section [scrollAnchor]="'project-' + project.id">...</section>
```

## Per-region and per-action overrides

```html
<div
  magicScroll
  #scroll="magicScroll"
  [scrollSource]="projects"
  [scrollOptions]="{ headerOffset: 16, behavior: { interaction: 'smooth' } }"
>
  ...
</div>
<button (click)="scroll.scrollTo('project-2', { behavior: 'instant', topOffset: 64 })">
  Show project 2 immediately
</button>
```

Region `headerOffset` adds to a measured header's height. Per-action `topOffset` is the complete desired offset and takes precedence. The target must already exist for an explicit action; automatic initial restoration waits for the optional `scrollSource` to be ready.

## Navigation highlighting and sticky panels

Use `scroll.activeAnchor()` for active-navigation state. Use `scroll.offset()` for a companion master panel's sticky top position and available height. The master–detail demo demonstrates document scrolling, a separately scrollable master and changing header heights with these values.

The scroll container is managed by the facade. Use per-region and per-action options for customization; low-level scroll services are internal.

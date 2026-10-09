---
title: Anchor navigation
description: Scroll to sections, choose anchors and highlight your navigation.
---

## Goal

Build a small section navigation that scrolls on click and highlights the current section as the user scrolls.

## Solution

Start with an Angular application that provides Router, as described in [Getting started](../../getting-started/). This complete component uses static content:

```ts
import { Component } from '@angular/core';
import {
  MagicScrollDirective,
  ScrollAnchorDirective,
  provideMagicScroll,
} from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-project-sections',
  imports: [MagicScrollDirective, ScrollAnchorDirective],
  providers: [provideMagicScroll({ anchorPrefix: 'project-' })],
  template: `
    <nav aria-label="Project sections">
      @for (id of sections; track id) {
        <button
          [attr.aria-current]="scroll.activeAnchor() === id ? 'location' : null"
          (click)="scroll.scrollTo(id)"
        >
          {{ id }}
        </button>
      }
    </nav>

    <div magicScroll #scroll="magicScroll">
      <section id="overview" scrollAnchor>
        <h2>Overview</h2>
      </section>
      <section id="project-planning">
        <h2>Planning</h2>
        <h3 id="planning-notes">Notes</h3>
      </section>
      <section [scrollAnchor]="'project-delivery'">
        <h2>Delivery</h2>
      </section>
    </div>
  `,
  styles: `
    section {
      min-height: 70vh;
    }
    button[aria-current='location'] {
      font-weight: bold;
    }
  `,
})
export class ProjectSectionsComponent {
  readonly sections = ['overview', 'project-planning', 'project-delivery'];
}
```

`anchorPrefix` includes the project sections and excludes unrelated IDs such as `planning-notes`. The explicit `scrollAnchor` includes `overview` despite its different prefix; the bound form also assigns the element's ID. Without a prefix, all descendant IDs participate and the markers are optional.

`scrollTo()` scrolls smoothly by default and synchronizes the fragment. `activeAnchor()` exposes that fragment; scroll-spy updates use a 500 ms debounce by default. IDs must be unique in the document and remain stable across renders.

### Override one interaction

For a particular button, pass per-call options:

```html
<button
  (click)="scroll.scrollTo('project-delivery', {
    behavior: 'instant',
    ignoreWhenInView: 'full'
  })"
>
  Show delivery if it is not fully visible
</button>
```

`scrollTo()` returns `false` when the target is unavailable, outside this region, excluded by anchor selection or skipped by the visibility rule. Each anchor belongs to its closest `magicScroll` region, so a parent cannot scroll to a nested region's anchors.

## Scope and related recipes

The target must already be rendered; this recipe does not load data or missing sections.

- [Return to a list](../return-to-list/) adds navigation between routed pages.
- [Angular rxResource](../rx-resource/) waits for asynchronously rendered anchors.
- [Sticky master–detail](../sticky-master-detail/) adds header offsets and sticky navigation.
- [Angular Material Drawer](../material-drawer/) moves scrolling into a nested container.

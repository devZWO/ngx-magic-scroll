---
title: Sticky master–detail
description: Combine document scrolling, a measured header and sticky section navigation.
---

## Goal

Build a portfolio page with a sticky header, an independently scrollable project index and details that scroll with the document. Keep navigation and offsets aligned when the header changes height.

## Solution

This compact version of the master–detail demo uses static projects so the layout is easy to see. Angular Router must be provided by the application.

<!-- recipe-check: sticky-master-detail-0.ts -->

```ts
import { Component, signal } from '@angular/core';
import { MagicScrollDirective, provideMagicScroll } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-portfolio',
  imports: [MagicScrollDirective],
  providers: [
    provideMagicScroll({
      anchorPrefix: 'project-',
      headerSelector: '.portfolio-header',
      headerOffset: 16,
    }),
  ],
  template: `
    <header class="portfolio-header">
      <strong>Portfolio</strong>
      <button (click)="expanded.set(!expanded())">Toggle toolbar</button>
      @if (expanded()) {
        <p>Additional project tools</p>
      }
    </header>

    <div class="layout" [style.--scroll-offset]="scroll.offset() + 'px'">
      <aside class="master">
        <nav aria-label="Projects">
          @for (project of projects; track project.id) {
            <button
              [attr.aria-current]="
                scroll.activeAnchor() === 'project-' + project.id ? 'location' : null
              "
              (click)="scroll.scrollTo('project-' + project.id)"
            >
              {{ project.name }}
            </button>
          }
        </nav>
      </aside>

      <div class="details" magicScroll #scroll="magicScroll">
        @for (project of projects; track project.id) {
          <section [id]="'project-' + project.id">
            <h2>{{ project.name }}</h2>
            <p>Planning, milestones and project details.</p>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .portfolio-header {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 16px;
      background: white;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(120px, 200px) minmax(0, 1fr);
      align-items: start;
      gap: 24px;
    }
    .master {
      position: sticky;
      top: var(--scroll-offset);
      max-height: calc(100dvh - var(--scroll-offset) - 16px);
      overflow-y: auto;
    }
    nav {
      display: flex;
      flex-direction: column;
    }
    button[aria-current='location'] {
      font-weight: bold;
    }
    .details {
      min-width: 0;
    }
    section {
      min-height: 70vh;
    }
  `,
})
export class PortfolioComponent {
  readonly expanded = signal(false);
  readonly projects = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `Project ${index + 1}`,
  }));
}
```

The detail region has no constrained height or scrolling overflow, so it uses document scrolling. The sidebar scrolls independently and sits outside the region; its elements are not detail anchors.

`headerSelector` measures the matching header and observes height changes. `headerOffset` adds a gap below it. `scroll.offset()` exposes the sum, which positions the sidebar and limits its height. Use a selector identifying the intended header uniquely.

Resize and header-height corrections are enabled by default and adjust the current anchor instantly. Set `preserveOnResize: false` in `scrollOptions` if those corrections are unwanted; the measured offset still remains available.

### Add asynchronously loaded details

Replace the static collection with your data source and bind it to the detail region. For a resource:

```html
<div class="details" magicScroll #scroll="magicScroll" [scrollSource]="projects">
  @if (projects.hasValue()) { @for (project of projects.value(); track project.id) {
  <section [id]="'project-' + project.id">{{ project.name }}</section>
  } }
</div>
```

Update the sidebar to render the same loaded collection. Initial restoration then waits for the data rather than consuming the fragment before the detail anchors exist.

## Scope and related recipes

The layout follows the zwoPRO-inspired demo, but leaves application forms and store architecture out of the example. It uses the document for detail scrolling; CSS still determines whether an ancestor becomes the scroll container.

- [Angular rxResource](../rx-resource/), [NgRx Signal Store](../ngrx-signal-store/) and [TanStack Query](../tanstack-query/) implement the corresponding data sources.
- [Anchor navigation](../scroll-to-anchor/) explains explicit anchor selection and per-click overrides.
- [Angular Material Drawer](../material-drawer/) uses a constrained content container instead of document scrolling.

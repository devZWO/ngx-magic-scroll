---
title: Angular Material Drawer
description: Scroll within mat-drawer-content and preserve anchors across layout changes.
---

## Goal

Place a section list inside Angular Material's drawer layout, with navigation in the drawer and scrolling confined to its content area.

## Solution

Use this in an application that already has Angular Material and its theme configured, and provides Angular Router. The library requires no Material-specific adapter.

```ts
import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-drawer-projects',
  imports: [MatSidenavModule, MagicScrollDirective],
  template: `
    <button (click)="drawer.toggle()">Toggle navigation</button>
    <mat-drawer-container class="shell">
      <mat-drawer #drawer mode="side" opened>
        <nav aria-label="Projects">
          @for (project of projects; track project.id) {
            <button (click)="scroll.scrollTo('project-' + project.id)">
              {{ project.name }}
            </button>
          }
        </nav>
      </mat-drawer>

      <mat-drawer-content>
        <div magicScroll #scroll="magicScroll">
          @for (project of projects; track project.id) {
            <section [id]="'project-' + project.id">
              <h2>{{ project.name }}</h2>
              <details>
                <summary>Project description</summary>
                <p>Additional content changes this section's height.</p>
              </details>
            </section>
          }
        </div>
      </mat-drawer-content>
    </mat-drawer-container>
  `,
  styles: `
    .shell {
      height: 70vh;
    }
    mat-drawer {
      width: 180px;
    }
    mat-drawer-content {
      overflow-anchor: none;
    }
    nav {
      display: flex;
      flex-direction: column;
    }
    section {
      min-height: 50vh;
      padding: 16px;
    }
  `,
})
export class DrawerProjectsComponent {
  readonly projects = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    name: `Project ${index + 1}`,
  }));
}
```

The constrained container height makes Material's `mat-drawer-content` scrollable. The directive detects that ancestor automatically. For a plain HTML layout, the same principle is a constrained ancestor with `overflow-y: auto`, or a scrollable `magicScroll` host itself.

The drawer's navigation is outside the anchor region. Nested `magicScroll` regions own their own descendant anchors; use unique IDs throughout the document. Regions share the page's single URL fragment, so independent containers do not have separate URL state.

`overflow-anchor: none` disables native browser scroll anchoring in this content area so it does not compete with the library's anchor corrections.

### Data and layout changes

For an asynchronous list, add `[scrollSource]="projects"` to the region and render the source's values in both lists. Later ready data changes can preserve the current anchor with `restoreOnDataChange`; window resizing and measured header changes use `preserveOnResize`.

The library does not observe every DOM size change. A drawer toggle or expanded section can change layout without a window resize or source update. If your application needs an explicit realignment after such an interaction, call `scroll.scrollTo(scroll.activeAnchor(), { behavior: 'instant' })` once the layout has settled, after checking that the anchor is non-null. Decide whether that movement fits the interaction before adding it.

## Scope and related recipes

This recipe isolates container layout. It does not implement filtering, pagination or data loading.

- [Angular rxResource](../rx-resource/) or [TanStack Query](../tanstack-query/) supplies asynchronous cards, as in the drawer demo.
- [Paginated lists](../paginated-lists/) adds loading and restoration of additional pages.
- [Return to a list](../return-to-list/) adds detail routes and return links.
- [Sticky master–detail](../sticky-master-detail/) covers document scrolling and measured headers.

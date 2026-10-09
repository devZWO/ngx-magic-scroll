---
title: Angular rxResource
description: Restore anchors after Observable data loads through rxResource.
---

## Goal

Open a URL such as `/projects#project-2` before the projects have loaded, then restore the section once its DOM exists.

## Solution

Import `MagicScrollDirective` and pass the `rxResource` itself to `scrollSource`. This self-contained example simulates an Observable API request; replace `of(...).pipe(delay(...))` with your service's Observable.

```ts
import { Component } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { delay, of } from 'rxjs';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-resource-projects',
  imports: [MagicScrollDirective],
  template: `
    <button (click)="projects.reload()">Reload</button>
    <div magicScroll [scrollSource]="projects">
      @if (projects.isLoading()) {
        <p role="status">Loading projects…</p>
      }
      @if (projects.error()) {
        <p role="alert">Could not load projects. Try reloading.</p>
      }
      @if (projects.hasValue()) {
        @if (projects.value().length === 0) {
          <p>No projects.</p>
        }
        @for (project of projects.value(); track project.id) {
          <section [id]="'project-' + project.id">
            <h2>{{ project.name }}</h2>
          </section>
        }
      }
    </div>
  `,
  styles: `
    section {
      min-height: 70vh;
    }
  `,
})
export class ResourceProjectsComponent {
  readonly projects = rxResource({
    stream: () =>
      of([
        { id: 1, name: 'Planning' },
        { id: 2, name: 'Delivery' },
        { id: 3, name: 'Review' },
      ]).pipe(delay(300)),
  });
}
```

The library reads the resource's loading and value state and restores the initial fragment after the first ready render. Passing `projects.value()` instead would discard the resource's loading information. Guard template calls to `value()` with `hasValue()` because reading an errored resource without a value can throw.

An empty array is a successful, ready result; an error without a value is not. Your application owns requests, retries and error presentation. Angular `resource` can be passed directly in the same way.

### Preserve position on later updates

Reloading or changing resource parameters can replace the content. After initialization, ready source changes preserve the **current** fragment with an instant correction when the anchor's top edge is no longer visible. They do not repeatedly restore the original fragment.

If that behavior does not fit your page, disable it for the region:

```html
<div magicScroll [scrollSource]="projects" [scrollOptions]="{ restoreOnDataChange: false }">
  <!-- Render projects here. -->
</div>
```

## Scope and related recipes

This recipe covers one resource and an unpaginated list. It does not retrieve missing pages or choose a new anchor when a filtered item disappears.

- [Return to a list](../return-to-list/) adds detail navigation and return links.
- [Paginated lists](../paginated-lists/) coordinates initial loading with a saved data range.
- [NgRx Signal Store](../ngrx-signal-store/) adapts existing store state.
- [TanStack Query](../tanstack-query/) uses a query result directly.

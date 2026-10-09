---
title: Return to a list
description: Restore a list section after detail navigation or a reload.
---

## Goal

Open an item's detail page and return to the same list section, using either browser Back or an explicit link.

## Solution

Provide these routes through your application's existing `provideRouter(routes)` configuration:

<!-- recipe-check: app.routes.ts -->

```ts
import { Routes } from '@angular/router';
import { ProjectsComponent } from './projects.component';
import { ProjectDetailsComponent } from './project-details.component';

export const routes: Routes = [
  { path: 'projects', component: ProjectsComponent },
  { path: 'projects/:id', component: ProjectDetailsComponent },
];
```

In `projects.component.ts`, use stable IDs and capture the selected item before leaving the list:

<!-- recipe-check: projects.component.ts -->

```ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-projects',
  imports: [MagicScrollDirective],
  template: `
    <div magicScroll>
      @for (project of projects; track project.id) {
        <section [id]="'project-' + project.id">
          <h2>{{ project.name }}</h2>
          <button (click)="openDetails(project.id)">Open details</button>
        </section>
      }
    </div>
  `,
  styles: `
    section {
      min-height: 70vh;
    }
  `,
})
export class ProjectsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly projects = [
    { id: 1, name: 'Planning' },
    { id: 2, name: 'Delivery' },
    { id: 3, name: 'Review' },
  ];

  async openDetails(id: number) {
    const recorded = await this.router.navigate([], {
      relativeTo: this.route,
      fragment: 'project-' + id,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
    if (!recorded) return;
    await this.router.navigate(['/projects', id], { queryParamsHandling: 'preserve' });
  }
}
```

`openDetails()` first records the clicked item's fragment in the list's current history entry, then waits for that URL update before navigating to the detail page. This avoids relying on the scroll-spy debounce or racing two navigations. Both this update and scroll-spy updates replace the current entry; detail navigation creates the next entry.

In `project-details.component.ts`, use the route ID for an explicit return link:

<!-- recipe-check: project-details.component.ts -->

```ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-project-details',
  imports: [RouterLink],
  template: `
    <h1>Project {{ id }}</h1>
    <a routerLink="/projects" [fragment]="'project-' + id" queryParamsHandling="preserve">
      Back to this project
    </a>
  `,
})
export class ProjectDetailsComponent {
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
}
```

Browser Back restores the fragment in the previous list entry. The explicit link also works when the detail page was opened directly. Query parameters are preserved so list settings can survive the round trip. Opening or reloading `/projects#project-2` restores the section after the list renders.

## Scope and related recipes

This example recreates a static list. Initial restoration runs once per `magicScroll` instance; a missing target at the first ready render is not retried automatically. It restores an anchor position rather than an exact pixel offset.

- [Angular rxResource](../rx-resource/), [NgRx Signal Store](../ngrx-signal-store/) and [TanStack Query](../tanstack-query/) supply asynchronous readiness.
- [Paginated lists](../paginated-lists/) restores the loaded data range before scrolling.
- [Anchor navigation](../scroll-to-anchor/) covers interaction options and navigation highlighting.

---
title: TanStack Query
description: Bind a TanStack Angular Query result directly to scrollSource.
---

## Goal

Restore an anchor after a query loads and keep the current section aligned when cached data is refreshed.

## Solution

If your application uses `@tanstack/angular-query-experimental`, its reactive `data()` and `isLoading()` getters already match `ScrollDataSource`. Pass the query result directly; the library does not depend on TanStack.

Register the query client alongside your existing Angular Router providers in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter([]), provideTanStackQuery(new QueryClient())],
};
```

Use your actual routes in place of `[]`. Then render a query in your component:

```ts
import { Component } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

interface Project {
  id: number;
  name: string;
}

@Component({
  selector: 'app-query-projects',
  imports: [MagicScrollDirective],
  template: `
    <div magicScroll [scrollSource]="projects">
      @if (projects.isLoading()) {
        <p role="status">Loading projects…</p>
      }
      @if (projects.isError()) {
        <p role="alert">Could not load projects.</p>
        <button (click)="projects.refetch()">Retry</button>
      }
      @if (projects.data()?.length === 0) {
        <p>No projects.</p>
      }
      @for (project of projects.data(); track project.id) {
        <section [id]="'project-' + project.id">
          <h2>{{ project.name }}</h2>
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
export class QueryProjectsComponent {
  readonly projects = injectQuery(() => ({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Could not load projects.');
      return response.json();
    },
  }));
}
```

The application endpoint `/api/projects` returns a project array. A failed response throws so TanStack can expose its error state. The query retains responsibility for retries, caching and refetching.

The library waits while the query is initially loading or `data()` is undefined. Cached data can be ready immediately. Keep the rendered list in place during a background fetch: `isFetching()` also includes background activity, whereas `isLoading()` describes the initial fetch without data. A disabled query without data still waits because its data is undefined.

When ready data changes after initialization, `restoreOnDataChange` preserves the current anchor by default. This is separate from cache policy and does not cause a request.

## Scope and related recipes

This recipe uses one ordinary query. It does not retrieve extra pages, restore filter state or force a refetch before initial restoration.

- [Paginated lists](../paginated-lists/#tanstack-infinite-query) adds an Infinite Query and a saved loading range, following the application-list pattern in the HNE frontend.
- [Return to a list](../return-to-list/) adds detail navigation.
- [Angular Material Drawer](../material-drawer/) places the same query-backed list inside a scrollable drawer layout.

See the official [TanStack Angular quick start](https://tanstack.com/query/latest/docs/framework/angular/quick-start) and [query guide](https://tanstack.com/query/latest/docs/framework/angular/guides/queries) for setup and query behavior. The Angular package is experimental; use the APIs provided by your installed version.

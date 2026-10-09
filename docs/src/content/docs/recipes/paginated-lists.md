---
title: Paginated lists
description: Restore the loaded range before restoring an anchor, with rxResource or TanStack Infinite Query.
---

## Goal

Let users load more items, open a detail page and return to an item beyond the first page. Restore both the loaded range and the anchor after browser Back or reload.

## Solution: restore data before scrolling

The fragment identifies the item; a query parameter records how much data must be available. For example, `/projects?count=16#project-12` means that the application loads the first 16 items before the directive attempts initial restoration.

This compact version of the drawer demo simulates a server that returns the requested range:

```ts
import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, of } from 'rxjs';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-paginated-projects',
  imports: [MagicScrollDirective],
  template: `
    <button [disabled]="projects.isLoading() || count() >= 100" (click)="loadMore()">
      Load more
    </button>
    <div magicScroll [scrollSource]="projects">
      @if (projects.isLoading()) {
        <p role="status">Loading projects…</p>
      }
      @if (projects.error()) {
        <p role="alert">Could not load projects.</p>
        <button (click)="projects.reload()">Retry</button>
      }
      @if (projects.hasValue()) {
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
      min-height: 50vh;
    }
  `,
})
export class PaginatedProjectsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly count = signal(
    Math.max(8, Math.min(100, Number(this.route.snapshot.queryParamMap.get('count')) || 8)),
  );
  readonly projects = rxResource({
    params: () => this.count(),
    stream: ({ params: count }) =>
      of(
        Array.from({ length: count }, (_, index) => ({
          id: index + 1,
          name: `Project ${index + 1}`,
        })),
      ).pipe(delay(300)),
  });

  async loadMore() {
    this.count.update((count) => Math.min(100, count + 8));
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { count: this.count() },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }
}
```

Replace the simulated request with an Observable API call that returns the first `count` items. If your backend only exposes individual pages, load the required initial pages in the application's data layer and expose the combined result as ready **after all those pages have loaded**.

The source is initially loading, so the initial fragment is not consumed by a partial first page. On subsequent updates, `restoreOnDataChange` keeps the current anchor's top edge visible when needed. Stable item IDs are essential: inserting items above an anchor should not change that anchor's ID.

Use `preserveFragment: true` when persisting the loading range. `replaceUrl: true` avoids adding a history entry for each load-more operation. Preserve the count parameter on detail links and return links, as described in [Return to a list](../return-to-list/).

### Choose the correction policy

The default preserves the current anchor after ready data changes. To let the user's viewport move naturally instead, disable data corrections for the region:

```html
<div magicScroll [scrollSource]="projects" [scrollOptions]="{ restoreOnDataChange: false }">
  <!-- Render the loaded collection here. -->
</div>
```

Appending items does not automatically scroll to the newly added item. If you want that interaction, wait for its DOM to render and then call `scrollTo()` deliberately. The source's readiness is used for automatic restoration; it does not queue explicit calls to missing targets.

## TanStack Infinite Query

For `@tanstack/angular-query-experimental`, keep the same URL contract and pass the Infinite Query directly. Configure the query client as shown in [TanStack Query](../tanstack-query/).

This component expects an endpoint accepting `offset` and `limit` and returning a project array. It requests the saved range in the first fetch, then adds eight items per subsequent page:

```ts
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

interface Project {
  id: number;
  name: string;
}

@Component({
  selector: 'app-infinite-projects',
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
      @for (project of items(); track project.id) {
        <section [id]="'project-' + project.id">
          <h2>{{ project.name }}</h2>
        </section>
      }
    </div>
    <button [disabled]="!projects.hasNextPage() || projects.isFetching()" (click)="loadMore()">
      {{ projects.isFetchingNextPage() ? 'Loading…' : 'Load more' }}
    </button>
  `,
  styles: `
    section {
      min-height: 50vh;
    }
  `,
})
export class InfiniteProjectsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageSize = 8;
  private readonly initialCount = Math.max(
    this.pageSize,
    Math.min(100, Number(this.route.snapshot.queryParamMap.get('count')) || this.pageSize),
  );
  readonly projects = injectInfiniteQuery(() => ({
    queryKey: ['projects', 'infinite', this.initialCount],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Project[]> => {
      const limit = pageParam === 0 ? this.initialCount : Math.min(this.pageSize, 100 - pageParam);
      const response = await fetch(`/api/projects?offset=${pageParam}&limit=${limit}`);
      if (!response.ok) throw new Error('Could not load projects.');
      return response.json();
    },
    getNextPageParam: (lastPage, pages, lastOffset) => {
      const requested =
        lastOffset === 0 ? this.initialCount : Math.min(this.pageSize, 100 - lastOffset);
      const total = pages.reduce((count, page) => count + page.length, 0);
      return lastPage.length === requested && total < 100 ? total : undefined;
    },
  }));
  readonly items = computed(() => this.projects.data()?.pages.flat() ?? []);

  async loadMore() {
    if (!this.projects.hasNextPage() || this.projects.isFetching()) return;
    const result = await this.projects.fetchNextPage();
    if (result.isError) return;
    const count = result.data?.pages.reduce((total, page) => total + page.length, 0);
    if (count === undefined) return;
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { count },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }
}
```

The source returns the query's page structure; the template renders the flattened collection. Both read the same reactive query data. `initialCount` is captured once so persisting a new count does not change the running query's cache key and restart it. It belongs in the cache key because it changes the initial request's size.

This mirrors the HNE frontend's strategy of requesting the previously loaded range first. The example assumes deterministic ordering, an offset-based API and a short response indicating the end of the list. This example caps the loaded range at 100 items; adapt that limit and the backend contract to your application. Cursor APIs need a different restoration strategy, and cached or removed pages must still contain the target before initial readiness.

See [TanStack's Infinite Queries guide](https://tanstack.com/query/latest/docs/framework/angular/guides/infinite-queries) for page state and fetching APIs.

## Scope and related recipes

The library does not fetch missing pages, persist filters or virtualize the list. A target missing from the first ready render is not automatically searched for in later pages. Restore filters and the necessary data range before declaring the source ready; choose an application fallback when an item has been deleted or filtered out.

- [Return to a list](../return-to-list/) covers the detail-navigation round trip.
- [Angular rxResource](../rx-resource/) and [TanStack Query](../tanstack-query/) explain the source contracts and error presentation.
- [NgRx Signal Store](../ngrx-signal-store/) adapts a store that already owns pagination.
- [Angular Material Drawer](../material-drawer/) adds the container layout used by the demo.

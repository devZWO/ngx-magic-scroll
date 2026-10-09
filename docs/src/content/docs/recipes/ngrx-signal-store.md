---
title: NgRx Signal Store
description: Adapt NgRx store signals into a scroll data source.
---

## Goal

Use the data and loading state of an existing `@ngrx/signals` store for anchor restoration, without moving data fetching into the component.

## Solution

This follows the portfolio-store pattern used in zwoPRO: the store owns projects, loading and errors. Install `@ngrx/signals` in your application if you do not already use it. The library itself has no NgRx dependency.

A minimal `projects.store.ts` distinguishes data that has not loaded yet from a successful empty result:

<!-- recipe-check: projects.store.ts -->

```ts
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

interface Project {
  id: number;
  name: string;
}

interface ProjectsState {
  projects: Project[] | undefined;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: undefined,
  loading: false,
  error: null,
};

export const ProjectsStore = signalStore(
  withState(initialState),
  withMethods((store) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Could not load projects.');
        const projects: Project[] = await response.json();
        patchState(store, { projects, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Could not load projects.' });
      }
    },
  })),
);
```

Use your existing API service or `rxMethod` implementation instead of `fetch` if the store already handles requests. Here `/api/projects` is an application endpoint returning a project array.

In `store-projects.component.ts`, provide the store and map its signals to the neutral `ScrollDataSource` contract:

<!-- recipe-check: store-projects.component.ts -->

```ts
import { Component, inject } from '@angular/core';
import { MagicScrollDirective, ScrollDataSource } from '@devzwo/ngx-magic-scroll';
import { ProjectsStore } from './projects.store';

@Component({
  selector: 'app-store-projects',
  imports: [MagicScrollDirective],
  providers: [ProjectsStore],
  template: `
    <button [disabled]="store.loading()" (click)="store.load()">Reload</button>
    <div magicScroll [scrollSource]="scrollSource">
      @if (store.loading()) {
        <p role="status">Loading projects…</p>
      }
      @if (store.error()) {
        <p role="alert">{{ store.error() }}</p>
      }
      @if (store.projects()?.length === 0) {
        <p>No projects.</p>
      }
      @for (project of store.projects(); track project.id) {
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
export class StoreProjectsComponent {
  readonly store = inject(ProjectsStore);
  readonly scrollSource: ScrollDataSource = {
    data: () => this.store.projects(),
    isLoading: () => this.store.loading(),
  };

  constructor() {
    void this.store.load();
  }
}
```

The getters must read signals so changes are tracked. Adapt the names to your store; for a filtered view, `data()` should return the collection actually rendered by the template. An NgRx store with fields called `projects` and `loading` does not automatically satisfy the `data()`/`isLoading()` contract.

### If your store starts with an empty array

`[]` is a ready value. If the store initially contains `projects: []` and `loading: false`, add a `loaded` signal that becomes true only after a successful request. Gate the source's data:

```ts
readonly scrollSource: ScrollDataSource = {
  data: () => this.store.loaded() ? this.store.projects() : undefined,
  isLoading: () => this.store.loading(),
};
```

This is an alternative for an existing store; it requires that store to expose `loaded`. It prevents an idle or failed first request from consuming initial restoration. Do not use array length to detect successful loading, because an empty response is valid.

## Scope and related recipes

This recipe demonstrates the adapter and initial readiness. Store lifetime, caching, concurrency and filtering remain application responsibilities; use an existing root-provided store without adding a second component provider if you want to retain its state between pages.

- [Return to a list](../return-to-list/) covers route fragments and detail navigation.
- [Sticky master–detail](../sticky-master-detail/) combines the source with a portfolio layout.
- [Paginated lists](../paginated-lists/) explains saved load ranges and later data corrections.

See the [NgRx Signal Store guide](https://ngrx.io/guide/signals/signal-store) for store design and additional features.

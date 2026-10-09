---
title: Getting started
description: Install and use ngx-magic-scroll in your Angular application.
---

This guide shows how to install `@devzwo/ngx-magic-scroll` and add anchor scrolling, URL fragment synchronization and scroll restoration to your Angular application.

## Prerequisites

`ngx-magic-scroll` requires Angular 22.2 and RxJS 7.8 within the supported major versions. Your application must provide Angular Router.

## Installation

Install the library in your Angular project:

```bash
npm install @devzwo/ngx-magic-scroll
```

```bash
pnpm add @devzwo/ngx-magic-scroll
```

## Configure Angular Router

If your application already provides Angular Router, keep your existing configuration. Otherwise, register it in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter([])],
};
```

Use your application's routes in place of the empty array when adding routed pages.

## Your first scroll region

Import `MagicScrollDirective` in your component and add `magicScroll` to the element containing your sections. Give each section a stable, unique ID:

```ts
import { Component } from '@angular/core';
import { MagicScrollDirective } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-projects',
  imports: [MagicScrollDirective],
  template: `
    <div magicScroll>
      <section id="project-1">
        <h2>Project 1</h2>
        <p>Project details...</p>
      </section>
      <section id="project-2">
        <h2>Project 2</h2>
        <p>Project details...</p>
      </section>
    </div>
  `,
})
export class ProjectsComponent {}
```

All descendant IDs participate by default. The directive automatically finds the scroll container, updates the URL fragment while scrolling and restores an initial fragment after rendering. For example, opening the page with `#project-2` scrolls to the second section.

No additional configuration is needed for static content or data already loaded by a router resolver. The page needs enough content to scroll for the movement to be visible.

## Scroll to a section

Export the directive as a template reference and call `scrollTo()` from a button:

```html
<button (click)="scroll.scrollTo('project-2')">Show project 2</button>

<div magicScroll #scroll="magicScroll">
  <section id="project-1">Project 1...</section>
  <section id="project-2">Project 2...</section>
</div>
```

The target must already be rendered. User interactions scroll smoothly by default.

## Asynchronous content

When your content loads asynchronously, bind its signal or Angular resource to `scrollSource`. This lets the library wait for the data before restoring the initial fragment.

For example, a signal can start with `undefined` and receive the loaded projects later:

```ts
import { signal } from '@angular/core';

interface Project {
  id: number;
  name: string;
}

// Inside your component; set this signal when your data has loaded.
readonly projects = signal<Project[] | undefined>(undefined);
```

```html
<div magicScroll [scrollSource]="projects">
  @for (project of projects(); track project.id) {
  <section [id]="'project-' + project.id">
    <h2>{{ project.name }}</h2>
  </section>
  }
</div>
```

Pass the signal itself as `scrollSource`; call it in the template to render its value. You can also pass an Angular `resource` or `rxResource` directly. Your application remains responsible for fetching data and displaying loading and error states.

## Configure defaults

Optionally register `provideMagicScroll()` alongside your existing providers in `app.config.ts`:

```ts
import { provideMagicScroll } from '@devzwo/ngx-magic-scroll';

// Add to appConfig.providers:
provideMagicScroll({
  anchorPrefix: 'project-',
  headerSelector: '.app-header',
  headerOffset: 16,
});
```

This limits automatic anchors to IDs starting with `project-` and leaves a 16-pixel gap below your header. The library measures the header's height automatically. Use a selector matching your application's header.

Override defaults for an individual scroll region with `scrollOptions`:

```html
<div magicScroll [scrollOptions]="{ headerOffset: 24 }">
  <section id="project-1">Project 1...</section>
</div>
```

## Next steps

- [Concepts](../concepts/): understand anchor ownership and scroll containers, then explore URL state, restoration and layout changes.
- [Anchor navigation](../recipes/scroll-to-anchor/): explicit anchors, navigation highlighting and per-action options.
- [API reference](../api/readme/): directives, configuration and supported data source types.

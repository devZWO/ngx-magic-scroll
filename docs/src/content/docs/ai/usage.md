---
title: AI Agent Integration Guide
description: Concise reference and integration rules for AI coding assistants using @devzwo/ngx-magic-scroll.
---

This guide provides compact, high-density reference instructions for AI agents and automated code generators integrating or upgrading `@devzwo/ngx-magic-scroll`.

## Package Metadata & Prerequisites

- **Package**: `@devzwo/ngx-magic-scroll`
- **Framework Support**: Angular `^22.2.0`, RxJS `^7.8.0`
- **Prerequisites**: Angular Router enabled (`provideRouter(...)` in `app.config.ts`) for fragment synchronization and history restoration.
- **Conventions**: Angular standalone components (do not set `standalone: true` in `@Component`), signal inputs/outputs, and native control flow (`@if`, `@for`).

## Minimal Integration Example

<!-- recipe-check: ai-usage-minimal.ts -->

```ts
import { Component } from '@angular/core';
import {
  MagicScrollDirective,
  ScrollAnchorDirective,
  provideMagicScroll,
} from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-agent-doc-sample',
  imports: [MagicScrollDirective, ScrollAnchorDirective],
  providers: [provideMagicScroll()],
  template: `
    <nav aria-label="Page Sections">
      <button (click)="scroll.scrollTo('intro')">Intro</button>
      <button (click)="scroll.scrollTo('details', { focus: true })">Details</button>
    </nav>

    <main magicScroll #scroll="magicScroll">
      <section id="intro">
        <h2>Introduction</h2>
      </section>
      <section id="details" scrollAnchor>
        <h2>Details</h2>
      </section>
    </main>
  `,
})
export class AgentDocSampleComponent {}
```

## Recipe Decision Guide

Select the appropriate recipe and configuration based on application requirements:

| Requirement / Scenario            | Recommended Recipe                                                                                    | Key Configuration / API                                                                                   |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Static Navigation & Spy**       | [Anchor Navigation](../recipes/scroll-to-anchor.md)                                                   | `[magicScroll]`, `#scroll="magicScroll"`, `scroll.activeAnchor()`, `scroll.scrollTo(id, { focus: true })` |
| **Async Data (Angular Resource)** | [rxResource Integration](../recipes/rx-resource.md)                                                   | `[scrollSource]="resource"`, `[scrollAnchor]="item.id"`                                                   |
| **Async Data (Signal State)**     | [NgRx Signal Store](../recipes/ngrx-signal-store.md) / [TanStack Query](../recipes/tanstack-query.md) | `[scrollSource]="store.items"` or `[scrollSource]="query.data"`                                           |
| **Appended / Paginated Lists**    | [Paginated Lists](../recipes/paginated-lists.md)                                                      | `[scrollSource]="items()"`, automatic top-anchor retention during append                                  |
| **Cross-Route Return**            | [Return to List](../recipes/return-to-list.md)                                                        | Browser history popstate auto-restoration                                                                 |
| **Sticky Header / Layout Offset** | [Sticky Master-Detail](../recipes/sticky-master-detail.md)                                            | `[headerOffset]="measuredHeight()"` or `[topOffset]="64"`                                                 |
| **Drawer / Nested Container**     | [Material Drawer](../recipes/material-drawer.md)                                                      | `[magicScroll]` directly on the scrolling overflow container                                              |
| **Dynamic Reflow / Accordion**    | [Position Preservation](../concepts/position-preservation.md)                                         | `provideMagicScroll({ preserveOnLayoutChange: true })`                                                    |

## Core Integration Rules & Common Pitfalls

### 1. `scrollSource` Reactivity

- **Rule**: Pass live reactive signals or resource references to `[scrollSource]`, never evaluated static values in non-reactive contexts.
- **Pitfall**: Passing `[scrollSource]="resource.value()"` creates a static snapshot if not evaluated inside a reactive signal context; pass `[scrollSource]="resource"` directly when using `ResourceRef` or `rxResource`.
- **Readiness**: `undefined` indicates loading. Position restoration and fragment navigation wait until data resolves to a defined value (array, object, or `null`).

### 2. Anchor Scoping & ID Uniqueness

- **Containment**: Every anchor element belongs strictly to its closest parent `[magicScroll]` region. A parent scroll instance cannot scroll to anchors inside a nested scroll region.
- **Stability**: Anchor `id` attributes must be globally unique across the document and remain stable between renders.
- **Selective Anchors**: Use `[anchorPrefixes]="['section-']"` or `explicitOnly: true` with `[scrollAnchor]` to avoid treating arbitrary DOM IDs as scroll anchors.

### 3. Accessible Focus Transfer

- When triggering navigation from button clicks or shortcuts, pass `{ focus: true }` to `scrollTo(id, { focus: true })`.
- Non-focusable elements automatically receive temporary `tabindex="-1"`, cleaned up on blur or directive destruction.
- Smooth scrolling coordinates focus transfer on scroll completion (`scrollend`).

### 4. Layout Preservation During Reflows

- Enable `preserveOnLayoutChange: true` to prevent content jumps when accordions toggle, images load, or forms expand above the user's viewport.
- The library tracks section-relative displacement to preserve the exact reading position without layout thrashing.

## Upgrade & Migration Workflow

When updating `@devzwo/ngx-magic-scroll` in an existing project:

1. **Verify Installed Version**: Inspect `package.json` for `@devzwo/ngx-magic-scroll`.
2. **Review Changelog**: Check [Changelog](../../CHANGELOG.md) for breaking changes, new features, and deprecation notices.
3. **Check Version Migration Guides**: Consult [Migration Guides](../migrations/v1.0-to-v1.1.md) for step-by-step code transformations and before/after snippets.
4. **Run Project Validation**: Verify template compilation and unit tests with `ng build` / `pnpm test`.

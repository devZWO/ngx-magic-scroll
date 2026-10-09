---
title: Data readiness and restoration
description: Understand when initial restoration runs and what your application must render first.
sidebar:
  order: 3
---

Initial restoration needs both an anchor identifier and a rendered target. `scrollSource` coordinates restoration with your application's data state. It observes readiness; your application loads the data and renders the elements that the fragment identifies.

## The initial restoration sequence

A region follows this sequence:

1. Capture the route fragment when the directive is created.
2. Wait for its source to be ready, if a source is supplied.
3. After rendering, attempt to scroll to the captured anchor.
4. Finish initial restoration, whether or not the target was found.

Without `scrollSource`, the first rendered DOM is considered ready. This suits static content and data already available from a router resolver.

For asynchronous content, bind the signal or resource that governs the rendered anchors. Pass a signal itself to `scrollSource`, and read its value where you render the collection. This lets readiness track the same data that produces the targets.

## Readiness is a data contract

| Source state                                                 | Initial restoration            |
| ------------------------------------------------------------ | ------------------------------ |
| No `scrollSource` supplied                                   | Attempt after the first render |
| Plain value or signal yielding `null` or `undefined`         | Wait                           |
| Plain value or signal yielding `[]`, `0`, `false` or `''`    | Ready                          |
| Resource or neutral source reporting `isLoading()` as `true` | Wait                           |
| Non-loading resource with an available, non-null value       | Ready                          |
| Non-loading neutral source with non-null `data()`            | Ready                          |

Angular resources expose `isLoading()`, `hasValue()` and `value()`. A resource with no value, including an error state without a value, cannot trigger restoration. The application owns loading indicators, error presentation and retries.

Readiness does not inspect whether the requested anchor exists. An empty collection is ready even though it contains no item anchors. Likewise, data can be ready while a separate conditional view still hides the target. Expose a source that reflects all prerequisites for rendering the intended content.

For signal forms, use the field's value signal, such as `form().value`, rather than the field tree itself. Source-specific adapters and types are covered by the recipes and API below.

## The first ready render is decisive

Initial restoration is attempted once per directive instance. If the fragment is absent or its target is missing or ineligible at the first ready render, the attempt does not scroll or rewrite the URL. It is not automatically retried as initial restoration when that target appears later.

Later ready source changes can still trigger position preservation using the current fragment. That is a separate behavior, described in [Position preservation and layout changes](../position-preservation/), and should not be used as a strategy for loading a missing initial target.

An explicit `scrollTo()` call also requires an existing target. It does not wait for `scrollSource` to become ready.

## Restore application state before declaring readiness

Consider `/projects?count=16#project-12`:

- The fragment identifies project 12.
- The query parameter tells the application to load the first 16 items.
- The source becomes ready after that required range is available.
- The rendered region can then restore project 12.

If only the first eight items are exposed as ready, the initial attempt cannot find project 12. The library does not fetch additional pages, restore filters or materialize virtualized items.

Restore the relevant filters, ordering and data range in your application before readiness. If an item was deleted or filtered out, choose an application fallback rather than expecting automatic target discovery.

## Related documentation

- [Paginated lists](../../recipes/paginated-lists/) restores the loaded range before the anchor.
- [Angular rxResource](../../recipes/rx-resource/), [NgRx Signal Store](../../recipes/ngrx-signal-store/) and [TanStack Query](../../recipes/tanstack-query/) connect different data owners.
- [ScrollSource](../../api/type-aliases/scrollsource/), [ScrollResource](../../api/interfaces/scrollresource/) and [ScrollDataSource](../../api/interfaces/scrolldatasource/) define supported source contracts.

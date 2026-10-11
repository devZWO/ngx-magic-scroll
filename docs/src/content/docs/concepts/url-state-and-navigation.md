---
title: URL state and navigation
description: Understand how scrolling, explicit navigation and restoration use the route fragment.
sidebar:
  order: 2
---

The route fragment is the shared anchor identifier used by scroll tracking, explicit navigation and restoration. These operations use it at different times: scrolling records an anchor, `scrollTo()` requests movement, and a newly created region captures the fragment for initial restoration.

## Scrolling records an anchor

After scrolling settles, the region determines which section the user is currently reading based on the activation boundary:

`boundary = containerTop + headerHeight + headerOffset`

1. **Top boundary reference**: For document scrolling, `containerTop` is `0`. For nested scrollable containers (`overflow: auto | scroll`), `containerTop` is the container's top edge (`getBoundingClientRect().top`).
2. **Sticky or fixed headers**: With `headerSelector`, the measured height of any sticky header is added so content obscured beneath the header does not trigger premature activation.
3. **Offset spacing**: With `headerOffset`, custom pixel padding or trigger line offsets can be configured.

An anchor becomes active as soon as its top edge reaches or crosses the activation boundary (`top <= boundary`). When scrolling through tall or multi-paragraph sections, that section **remains active** while being read, even after its heading has scrolled past the top boundary, until the next section reaches the activation boundary. When scrolling backwards (upwards), as soon as a section heading drops back below the boundary, the preceding section becomes active again. When scrolled above all anchors, the first anchor is selected.

Scroll-spy updates are debounced by 500 ms by default (`debounceTime`). During continuous movement, the fragment can therefore lag behind the viewport until scrolling pauses. If there are no eligible candidates, the existing fragment remains unchanged.

`activeAnchor()` exposes the current fragment as a signal and reacts to route-fragment changes. Use it to highlight active navigation links and scroll-spy indicators.

## Explicit navigation requests movement

For a user action within an existing region, call `scrollTo()` on that region:

```html
<button (click)="scroll.scrollTo('project-12')">Show project 12</button>
<div magicScroll #scroll="magicScroll">
  <section id="project-12">Project 12...</section>
</div>
```

The target must already be rendered and selected by the region. By default, the call initiates smooth scrolling and updates the fragment. Its boolean return value reports whether scrolling was initiated, not whether the animation has finished.

A call returns `false` when the target is missing, excluded, owned by another region or skipped by the configured visibility rule. A skipped call does not itself update the fragment. Data readiness does not queue explicit calls for later execution.

## Initial restoration reads the entry fragment

When a region is created, it captures the route's current fragment. Once its content is ready and rendered, it attempts to restore that anchor once. This supports opening a section link, reloading it or returning to a routed list whose region is recreated.

Changing only the fragment while retaining the same directive instance updates `activeAnchor()`, but does not by itself trigger another initial restoration or a general automatic scroll operation. Use `scrollTo()` for in-page interactions that should move the existing region.

See [Data readiness and restoration](../data-readiness-and-restoration/) for the timing and missing-target behavior.

## URL updates preserve the current history entry

Library fragment updates preserve query parameters and use Angular Router's `replaceUrl`. Scrolling through sections therefore updates the current history entry instead of creating a new entry for every anchor.

For a list-to-detail round trip, these roles are complementary:

1. The list's fragment records the item to return to.
2. Navigation to the detail page creates the next history entry.
3. Browser Back returns to the list URL, and the recreated region restores its fragment.

If clicking an item should define the return target, record that item's fragment before leaving and await the URL update. The debounced scroll spy may still name another item at click time. Query parameters can separately preserve filters or the loaded data range; the fragment identifies the section within that restored state.

## Related documentation

- [Return to a list](../../recipes/return-to-list/) implements the history sequence and an explicit return link.
- [Anchor navigation](../../recipes/scroll-to-anchor/) builds navigation highlighting and per-action overrides.
- [Scroll regions and anchor identity](../anchors/) explains eligible targets and shared fragment state.
- [MagicScrollDirective](../../api/classes/magicscrolldirective/) documents `activeAnchor()` and `scrollTo()`.

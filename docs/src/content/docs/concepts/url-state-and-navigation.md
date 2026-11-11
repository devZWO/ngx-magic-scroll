---
title: URL state and navigation
description: Understand how scrolling, explicit navigation and restoration use the route fragment.
sidebar:
  order: 2
---

The route fragment is the shared anchor identifier used by scroll tracking, explicit navigation and restoration. These operations use it at different times: scrolling records an anchor, `scrollTo()` requests movement, and a newly created region captures the fragment for initial restoration.

## Scrolling records an anchor

After scrolling settles, the region determines which section the user is currently reading based on an evaluated visible reading area and a hybrid evaluation model:

- **Top boundary (`topBoundary`)**: `containerTop + headerHeight + headerOffset`
  - For document scrolling, `containerTop` is `0`.
  - For nested scrollable containers (`overflow: auto | scroll`), `containerTop` is the container's top edge (`getBoundingClientRect().top`).
  - With `headerSelector`, sticky header height is measured and added dynamically.
  - With `headerOffset`, custom pixel padding or trigger line offsets are included.
- **Bottom boundary (`bottomBoundary`)**: `(isDocument ? window.innerHeight : containerBottom) - bottomOffset`
  - With `bottomOffset`, bottom margins or space occupied by sticky footers and bottom floating bars are excluded from the active evaluation window.
- **Trigger line (`triggerLine`)**: `topBoundary + (bottomBoundary - topBoundary) * activationThreshold`
  - With `activationThreshold` (`0.0` to `1.0`, default `0.0`), developers can position the active trigger focal line anywhere across the visible reading band (e.g. `0.3` for upper-third reading focus, `0.5` for center trigger).

### Evaluation Priority

A destination of a deliberate navigation takes precedence over this geometry while it remains visible; see [Deliberate destinations stay active while visible](#deliberate-destinations-stay-active-while-visible).

1. **Fully Contained Sections (Full Containment Elevation)**: If an upcoming section is 100% visible within the reading area (`top >= topBoundary - 1` and `bottom <= bottomBoundary + 1`), it becomes active immediately—even if a small tail of the previous section is still visible at the top. If multiple sections are fully visible, the topmost fully contained section is selected.
2. **Tall Section Reading Retention (Reading Line Fallback)**: For sections that are taller than the viewport (or long multi-paragraph articles), the section remains active while scrolling through its body (`top <= triggerLine + 1`) until a subsequent section crosses the trigger line or becomes fully visible.
3. **Top of Page Fallback**: When scrolled above all anchors, the first anchor is selected.

```mermaid
flowchart TD
    ScrollEvent[User scrolls in viewport/container] --> Debounce[Wait for debounceTime ms<br/><i>default: 500ms</i>]
    Debounce --> ReadLayout[Measure Layout & Active Configuration]

    subgraph BoundaryCalculation [Boundary & Trigger Line Calculation]
        ReadLayout --> TopB["topBoundary = containerTop<br/>+ headerHeight(headerSelector)<br/>+ headerOffset"]
        ReadLayout --> BotB["bottomBoundary = containerBottom<br/>- bottomOffset"]
        TopB & BotB --> TrigLine["triggerLine = topBoundary +<br/>(bottomBoundary - topBoundary) * activationThreshold"]
    end

    TrigLine --> CheckContainment{"Any section fully contained in reading band?<br/><i>top >= topBoundary - 1 && bottom <= bottomBoundary + 1</i>"}

    CheckContainment -- Yes --> SelectContained[Select topmost fully contained section]
    CheckContainment -- No --> CheckTrigger{"Any section top <= triggerLine + 1?"}

    CheckTrigger -- Yes --> SelectTriggered[Select most recently crossed section<br/><i>max top <= triggerLine</i>]
    CheckTrigger -- No --> SelectFirst[Select first anchor in document]

    SelectContained --> StateUpdate[Active Section Selected]
    SelectTriggered --> StateUpdate
    SelectFirst --> StateUpdate

    StateUpdate --> ChangedCheck{"Selected anchor == activeAnchor()?"}
    ChangedCheck -- No --> SyncFragment["Update activeAnchor() signal<br/>& update URL fragment (replaceUrl)"]
    ChangedCheck -- Yes --> Noop[Preserve current URL fragment]
```

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

Optionally, passing `{ focus: true }` transfers DOM focus safely to the target anchor without secondary scroll jumps, managing temporary `tabindex="-1"` for non-focusable landmark containers with automatic cleanup on blur or directive destruction.

A call returns `false` when the target is missing, excluded, owned by another region or skipped by the configured visibility rule. A skipped call does not itself update the fragment. Data readiness does not queue explicit calls for later execution.

## Initial restoration reads the entry fragment

When a region is created, it captures the route's current fragment. Once its content is ready and rendered, it attempts to restore that anchor once. This supports opening a section link, reloading it or returning to a routed list whose region is recreated.

See [Data readiness and restoration](../data-readiness-and-restoration/) for the timing and missing-target behavior.

## Subsequent router fragment navigation

When external router navigation changes the URL fragment subsequently (e.g. via `[routerLink]`, programmatic `router.navigate()`, or browser history Back/Forward navigation), `MagicScrollDirective` automatically restores the scroll position to the target anchor using `behavior.restoration`.

To prevent feedback loops between user-driven router navigations and the automatic scroll-spy, the library uses internal origin discrimination:

```mermaid
graph TD
    RouterLink[RouterLink / History / router.navigate] -->|External Navigation| Router[Angular Router]
    Router -->|Route Fragment Signal| Directive[MagicScrollDirective]
    ScrollEvent[Scroll Event] -->|Debounced Scroll Spy| linkedRoute[linkedRouteFragment]
    linkedRoute -->|Internal Navigation with Origin Tag| Router
    Directive -->|Filter out Internal Origin| DestinationQueue[Pending Destination Handler]
    DestinationQueue -->|Wait for Source Ready & DOM| ScrollExec[ScrollService.scroll]
```

## Deliberate destinations stay active while visible

The destination of a deliberate navigation — a successful `scrollTo()`, the restored entry fragment, or a subsequent router fragment navigation — stays the active anchor while it overlaps the visible reading area (between `topBoundary` and `bottomBoundary`). Scroll-spy publication, `liveAnchor`-based preservation and the end of a smooth navigation use this destination instead of the geometric evaluation above.

This matters whenever a requested target cannot reach the reading line:

- **End of the document**: the last section is shorter than the remaining viewport, so the container stops at its maximum scroll position. Without this rule, an earlier, fully contained anchor would replace the requested fragment after `debounceTime`.
- **Nested anchors**: a section contains an anchor near its top. If the section settles slightly above the reading line, its fully contained child would otherwise win.
- **Repeated activation**: activating the same destination again does not create another history entry because the fragment is still the destination.

While a smooth navigation is still moving, the destination is kept even if it is not visible yet. Once the navigation has settled, its displacement from the top boundary is recorded. The destination is released by user scroll intent (`wheel`, `touchstart`, `touchmove` or scroll keys outside editable controls), by any other scroll that moves it more than one pixel relative to that recorded position (for example dragging the scrollbar or setting `scrollTop` programmatically), once it no longer overlaps the reading area, or when the fragment is cleared. Layout preservation restores the recorded displacement and therefore keeps the destination. A released destination does not become active again merely by scrolling back into view; the regular evaluation applies until the next deliberate navigation.

A deliberate navigation also discards a scroll-spy publication that was scheduled by earlier scroll events and has not been committed yet.

## Pausing or discarding scroll-spy publication

Applications that orchestrate a navigation over several steps, for example closing a dialog before routing to a target, can control the debounced publication explicitly:

- `discardPendingPublication()` drops a publication that is scheduled but not yet committed. Later scroll events schedule publications again.
- `suspendPublication()` stops the scroll spy from writing the fragment until the returned resume function is called. Suspensions nest, the resume function is idempotent, and resuming does not publish immediately; the next scroll event schedules a regular debounced publication. `scrollTo()` and position preservation keep working while publication is suspended.

```ts
const resume = scroll.suspendPublication();
try {
  await firstValueFrom(dialogRef.afterClosed());
  await router.navigate([], { fragment: 'project-12', queryParamsHandling: 'preserve' });
} finally {
  resume();
}
```

## URL updates yield to in-flight navigations

A scroll-spy update or `scrollTo()` can become due while the Router is still resolving a user navigation. The fragment writer does not start a competing navigation in that case: it retains the latest requested fragment and lets the user's navigation finish without `SupersededByNewNavigation`.

```mermaid
sequenceDiagram
    participant User
    participant Router
    participant Guard as Async guard / resolver / lazy loader
    participant Writer as linkedRouteFragment
    participant View as Scroll region

    User->>Router: Navigate to another URL
    Router->>Guard: Start pending route work
    Guard-->>Router: Wait for decision or loading
    View->>Writer: Write the latest visible anchor
    Writer->>Writer: Defer fragment and remember route path
    Note over Writer,Router: No competing navigateByUrl is started
    alt Navigation is canceled, errors or is skipped
        Router-->>Writer: NavigationCancel / Error / Skipped
        Writer->>Router: Publish latest fragment with replaceUrl
    else Navigation ends on the same path without a new fragment
        Router-->>Writer: NavigationEnd (query may differ)
        Writer->>Router: Publish latest fragment with replaceUrl
    else Different path, new fragment or destroyed region
        Router-->>Writer: NavigationEnd or region destruction
        Writer->>Writer: Discard deferred fragment
    end
```

On `NavigationCancel`, `NavigationError` or `NavigationSkipped`, the last deferred value is published once if it still differs from the URL fragment. After `NavigationEnd`, it is published only when the path (compared without query parameters and fragment) is unchanged; a route change discards it. A fragment explicitly set by the user navigation wins, and a destroyed region never publishes later. The queued write still uses `replaceUrl`, and `scrollTo()` performs its scroll immediately while only its URL update is deferred. Deferred local writes are not treated as external fragment changes by phase-3 restoration.

If a test Router mock omits `currentNavigation()` or `events`, the library keeps its previous immediate-write behavior and emits one `console.warn` per `linkedRouteFragment` instance to make the missing in-flight protection visible.

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
- [MagicScrollDirective](../../api/classes/magicscrolldirective/) documents `activeAnchor()`, `scrollTo()`, `discardPendingPublication()` and `suspendPublication()`.

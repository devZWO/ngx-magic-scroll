---
title: Position preservation and layout changes
description: Understand how later data updates, resizing and header changes affect the current anchor.
sidebar:
  order: 4
---

After initial restoration, content and layout can still move. Position preservation uses the current fragment to correct the anchor's position. It does not save an exact pixel offset or automatically select newly added content.

## Different causes have different policies

| Cause                                          | Target                                        | Default behavior                                                |
| ---------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Initial ready render                           | Fragment captured when the region was created | Restore once, instantly                                         |
| Explicit `scrollTo()`                          | Requested anchor                              | Scroll smoothly                                                 |
| Later ready source change                      | Current fragment                              | Correct instantly if the target's top edge is no longer visible |
| Window resize or measured header-height change | Current fragment                              | Realign instantly, even if the target is already visible        |

The distinction between the initial and current fragment matters. A page can initially restore project 12, then record project 18 as the user scrolls. A subsequent data change preserves project 18 rather than returning to project 12.

Data corrections require a supplied source and are enabled by `restoreOnDataChange`. Layout corrections are enabled by `preserveOnResize`. They only run after initial readiness and require the current fragment to identify an eligible, rendered target.

## Preservation follows the anchor

If content is inserted above the current anchor, its position changes. A later ready source update checks its top edge against the effective visible area. If that edge is still visible, the data correction leaves the viewport alone; otherwise it realigns the anchor with the top offset.

Appending items below the anchor usually leaves its top edge visible and does not move the viewport. It does not navigate to the appended item. For that interaction, wait for the new target to render and call `scrollTo()` explicitly.

Window resizing and measured header-height changes use a stronger policy: they realign the current anchor without the data correction's visibility check. This can move the viewport even when part of the section was already visible.

These corrections are tied to source changes, window resize and observed header height. They are not a general observer of every DOM size change. An image expanding independently of those triggers does not by itself guarantee a correction.

## Header measurement defines the top offset

The effective offset is:

```text
measured header height + headerOffset
```

With no configured or matching header, the measured height is zero and `headerOffset` supplies the entire offset. With a header, it adds a gap below that header. Use a `headerSelector` that uniquely identifies the intended element; its height is measured and observed automatically.

`offset()` exposes the sum, and `headerHeight()` exposes the measurement alone. A sticky companion panel can use the same sum for its CSS `top` so navigation and scroll alignment share one boundary.

A per-call `topOffset` replaces the entire effective offset for that action. It is not an additional gap. The browser's available scroll range can also limit alignment, for example when the last section has too little content below it to reach the requested top position.

## Choose a policy for your layout

Use `restoreOnDataChange: false` when data updates should let the viewport move naturally. Use `preserveOnResize: false` when automatic realignment during resizing or header changes is unwanted. Disabling layout corrections still leaves the measured header height and effective offset available.

Initial restoration and explicit interactions have separate behavior defaults: `behavior.restoration` is `instant`, and `behavior.interaction` is `smooth`. Automatic data and layout corrections remain instant.

Provider defaults are inherited through Angular's injector hierarchy. Region `scrollOptions` override those defaults, and supported per-call options override the region for one `scrollTo()` action. Visibility options control whether that explicit action is skipped; they do not change the automatic correction policies described above.

## Related documentation

- [Sticky master–detail](../../recipes/sticky-master-detail/) shares the measured offset with a sticky sidebar.
- [Paginated lists](../../recipes/paginated-lists/) shows data updates and optional correction disabling.
- [MagicScrollOptions](../../api/interfaces/magicscrolloptions/) documents configuration defaults and visibility rules.
- [MagicScrollToOptions](../../api/type-aliases/magicscrolltooptions/) documents per-action overrides.

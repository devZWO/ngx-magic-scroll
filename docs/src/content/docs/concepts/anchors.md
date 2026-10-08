---
title: Anchors and navigation
---

The current implementation uses stable HTML element IDs as anchors. A route fragment (`#item-42`) can identify a visible item independently of its absolute pixel position.

`linkedRouteFragment()` synchronizes a writable signal with the current route fragment and uses `replaceUrl` when writing it, to avoid creating a history entry for every scroll update.

`ScrollService` scrolls to an element ID and supports offsets and visibility conditions. Other directives react to data changes, scrolling, and window resizing. Their current signatures are documented in the generated API reference.

Scroll recovery, delayed rendering, nested scroll containers, and interaction with Angular Router's built-in scroll restoration need browser-level validation before a stable release. The current demo does not yet demonstrate these scenarios.

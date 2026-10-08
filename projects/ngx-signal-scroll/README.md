# @devzwo/ngx-magic-scroll

Angular signal utilities for anchor scrolling and navigation.

**Pre-release:** extracted implementation under review. The API and dependency surface may change before a stable release.

## Requirements

Angular 22.2 and RxJS 7.8. Current integrations also require ngxtension 7, TanStack Angular Query 5, and Angular signal generators 4; see `peerDependencies` for precise ranges.

## Example

```ts
import { inject } from '@angular/core';
import { ScrollService } from '@devzwo/ngx-magic-scroll';

const scroll = inject(ScrollService);
scroll.scroll('details', { topOffset: 64 });
```

Call `inject` in an Angular injection context and ensure the target HTML element exists before scrolling. `NearestAnchorProvider` requires explicit provider registration. Router helpers require Angular Router.

[Documentation and API](https://devzwo.github.io/ngx-magic-scroll/) · [Source and issues](https://github.com/devZWO/ngx-magic-scroll)

MIT, copyright 2026 devZWO GmbH.

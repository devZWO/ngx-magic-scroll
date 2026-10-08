---
title: Scroll to an anchor
---

Create a target with a stable ID and call the service from an Angular injection context:

```ts
import { Component, inject } from '@angular/core';
import { ScrollService } from '@devzwo/ngx-magic-scroll';

@Component({
  selector: 'app-example',
  template: `
    <button type="button" (click)="scrollToDetails()">Show details</button>
    <section id="details"><h2>Details</h2></section>
  `,
})
export class Example {
  private readonly scroll = inject(ScrollService);

  scrollToDetails(): void {
    this.scroll.scroll('details', { topOffset: 64 });
  }
}
```

The target must already exist in the DOM. For a nested scroll container, pass the container as the `scrollable` option. Async data and route recovery recipes will follow once the extracted directives have been tested.

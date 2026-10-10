import { Directive, effect, ElementRef, inject, input } from '@angular/core';

/**
 * Optional explicit anchor. Its ID participates even outside the configured prefix.
 * Use `scrollAnchor` alongside an existing id, or `[scrollAnchor]="item.id"` to set it.
 */
@Directive({
  selector: '[scrollAnchor]',
  host: { '[attr.data-scroll-anchor]': '""' },
})
export class ScrollAnchorDirective {
  readonly scrollAnchor = input('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    effect(() => {
      const id = this.scrollAnchor();
      if (id) this.host.nativeElement.id = id;
    });
  }
}

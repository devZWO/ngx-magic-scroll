import {
  AfterViewInit,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NearestAnchorProvider } from './nearest-anchor.provider';
import { debounceSignal } from '@ddtmm/angular-signal-generators';
import { injectScrollableParentElement } from './inject-scrollable-parent';

/**
 * Automatically identifies the nearest anchor while scrolling (scroll spy).
 *
 * Finds the scrollable ancestor with injectScrollableParentElement, attaches a debounced
 * scroll listener, and uses NearestAnchorProvider to find the anchor nearest the visible
 * top edge. Emits its ID through the output event, for example to update linkedRouteFragment.
 * @example
 * ```html
 * <div
 *   [appNearestAnchorScrollHook]
 *   (appNearestAnchorScrollHook)="routeFragment.set($event)"
 *   [selectorPrefix]="'item-card-'"
 *   [debounceTime]="300"
 * >
 *   @for (item of items(); track item.id) {
 *     <div [id]="'item-card-' + item.id">...</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[appNearestAnchorScrollHook]',
})
export class NearestAnchorScrollHook implements AfterViewInit, OnDestroy {
  /**
   * Prefix of eligible anchor IDs, for example 'item-card-'.
   * Prevents unrelated IDs on the page from being selected as anchors.
   * An empty prefix includes all elements with an id ([id]).
   */
  public selectorPrefix = input<string>('');

  /**
   * Delay in milliseconds after the last scroll event before calculating the nearest anchor.
   * Defaults to 500 ms to reduce work during rapid scrolling and avoid disrupting restoration.
   */
  public debounceTime = input<number>(500);

  /**
   * Emits the ID of the nearest visible anchor during scrolling.
   * The output alias matches the appNearestAnchorScrollHook selector.
   */
  public readonly nearestAnchor = output<string>({ alias: 'appNearestAnchorScrollHook' });

  private readonly _selector = computed(() =>
    this.selectorPrefix() ? `[id^="${this.selectorPrefix()}"]` : '[id]',
  );

  private readonly _host = inject(ElementRef<HTMLElement>);

  private readonly _nearestAnchorProvider = inject(NearestAnchorProvider);

  /** Optional header selector and additional offset at the visible top edge. */
  public readonly headerSelector = input<string>('.header');
  public readonly headerOffset = input(0);
  private readonly _document = inject(DOCUMENT);
  private _scrollTarget?: EventTarget;

  private readonly _scrolled = debounceSignal<Event | undefined>(undefined, this.debounceTime);

  private readonly _nearestAnchor = computed(() =>
    this._scrolled()
      ? (this._nearestAnchorProvider.getNearestAnchor({
          hostElement: this._host.nativeElement as HTMLElement,
          selector: this._selector(),
          headerSelector: this.headerSelector(),
          headerOffset: this.headerOffset(),
        }) ?? '')
      : '',
  );

  constructor() {
    effect(() => {
      const anchor = this._nearestAnchor();
      if (anchor) {
        this.nearestAnchor.emit(anchor);
      }
    });
  }

  ngAfterViewInit() {
    this._scrollTarget = injectScrollableParentElement(this._host.nativeElement) ?? this._document;
    this._scrollTarget.addEventListener('scroll', this._scrolled.set);
  }

  ngOnDestroy(): void {
    this._scrollTarget?.removeEventListener('scroll', this._scrolled.set);
  }
}

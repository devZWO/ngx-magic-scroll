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
 * Direktive zur automatischen Ermittlung des nächstgelegenen Ankers beim Scrollen (Scroll-Spy).
 *
 * Findet automatisch das übergeordnete scrollbare Element (`injectScrollableParentElement`),
 * registriert einen debouncten Event-Listener auf dessen `scroll`-Event und ermittelt über
 * den `NearestAnchorProvider` die ID des Elements, das der oberen Sichtkante am nächsten liegt.
 * Die ermittelte Anker-ID wird über das Output-Event emittiert (z. B. um `linkedRouteFragment` zu aktualisieren).
 *
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
   * Präfix für Anker-IDs, die berücksichtigt werden sollen (z. B. `'antrag-card-'`).
   * Verhindert, dass beliebige andere IDs auf der Seite fälschlicherweise als Anker gewählt werden.
   * Wenn leer, werden alle Elemente mit einer `id` (`[id]`) berücksichtigt.
   */
  public selectorPrefix = input<string>('');

  /**
   * Verzögerung in Millisekunden nach dem letzten Scroll-Event, bevor der nächste Anker berechnet wird.
   * Standardmäßig 500ms, um während schnellem Scrollen Rechenzeit zu sparen und Re-Scroll-Effekte
   * nicht zu stören.
   */
  public debounceTime = input<number>(500);

  /**
   * Emittiert die ID des am nächsten liegenden sichtbaren Ankers bei Scroll-Bewegungen.
   * Alias entspricht dem Selektor `appNearestAnchorScrollHook`.
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

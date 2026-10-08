import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { injectedHeaderHeight } from './inject-header-size';

/**
 * Konfigurationsoptionen für die Ermittlung des nächstgelegenen Ankers.
 */
export interface NearestAnchorOptions {
  /** Explicit scroll container, including a host that is itself scrollable. */
  scrollable?: HTMLElement;
  /** Preselected anchor elements (e.g. scoped, explicit anchors in the facade). */
  anchors?: readonly HTMLElement[];
  /**
   * Optionales Host-Element / übergeordneter Container, in dem nach Anker-Elementen gesucht wird.
   * Standardmäßig wird das gesamte `Document` durchsucht.
   */
  hostElement?: HTMLElement;
  /**
   * CSS-Selektor zum Auffinden relevanter Anchor-Elemente (z. B. `'[id^="antrag-card-"]'`).
   * Standardmäßig `'[id]'`.
   */
  selector?: string;
  /**
   * Statischer oberer Offset in Pixeln (z. B. fester Abstand oder Padding).
   */
  headerOffset?: number;
  /**
   * CSS-Selektor für ein fixes/sticky Header-Element (z. B. `'.header'`).
   * Dessen Höhe wird dynamisch ermittelt und zum Offset addiert, damit überdeckte Elemente
   * nicht fälschlicherweise als oberster sichtbarer Anker gewertet werden.
   */
  headerSelector?: string;
}

/**
 * Service zur Berechnung des Anker-Elements, das der oberen Kante des sichtbaren Scrollbereichs
 * am nächsten liegt.
 *
 * Eignet sich ideal für Scroll-Spy-Mechanismen, um beim Durchscrollen einer Seite oder Liste
 * das aktuell fokussierte Element zu erkennen und z. B. das URL-Fragment synchron zu halten.
 *
 * @remarks
 * Dieser Service besitzt kein `{ providedIn: 'root' }` und muss daher in der Anwendung
 * (z. B. `app.config.ts` unter `providers`) oder auf Komponentenebene registriert werden.
 */
@Injectable()
export class NearestAnchorProvider {
  private readonly document = inject(DOCUMENT);

  /**
   * Berechnet die ID des am nächsten zur Oberkante liegenden Anker-Elements.
   *
   * 1. Sucht alle passenden Elemente anhand des `selector` im `hostElement` (oder `document`).
   * 2. Filtert Elemente heraus, deren Oberkante oberhalb des berechneten Offsets liegt.
   * 3. Ermittelt unter den sichtbaren Elementen dasjenige mit der geringsten Distanz zur Oberkante.
   *
   * @param options - Konfigurationsoptionen (Host-Element, Selektor, Header-Offset etc.).
   * @returns Die ID des nächstgelegenen HTML-Elements oder `undefined`, falls kein passendes Element gefunden wurde.
   *
   * @example
   * ```ts
   * const nearestId = nearestAnchorProvider.getNearestAnchor({
   *   hostElement: listContainer,
   *   selector: '[id^="card-"]',
   *   headerSelector: '.app-header'
   * });
   * ```
   */
  public getNearestAnchor(options?: NearestAnchorOptions): string | undefined {
    const host = options?.hostElement ?? this.document;
    const selector = options?.selector ?? '[id]';
    const offset =
      (options?.headerOffset ?? 0) +
      (options?.headerSelector ? injectedHeaderHeight(options.headerSelector, this.document) : 0);

    // Collects all HTML elements with an id – these are our potential anchor targets
    const anchors = options?.anchors ?? Array.from(host.querySelectorAll<HTMLElement>(selector));
    const scrollable =
      options?.scrollable ??
      (options?.hostElement ? injectScrollableParentElement(options.hostElement) : undefined);
    const isDocument =
      scrollable === this.document.documentElement || scrollable === this.document.body;
    const top = (isDocument ? 0 : (scrollable?.getBoundingClientRect().top ?? 0)) + offset;
    // Browser scroll positions may round fractional header heights to whole pixels.
    const visibleAnchors = anchors.filter((el) => el.getBoundingClientRect().top >= top - 1);

    // Iterates through all anchors and calculates their distance to the current scroll position (in pixels)
    const closest = visibleAnchors.reduce(
      (closest, el) => {
        // Retrieves the distance of the element to the top edge of the viewport
        const offset = Math.abs(el.getBoundingClientRect().top);

        // Compares the current distance with the smallest distance so far
        // and keeps track of the closer element
        return offset < closest.offset
          ? { el, offset } // if closer: replace the previous one
          : closest; // otherwise: keep the previous one
      },
      {
        el: null as HTMLElement | null, // Initial value: no element
        offset: Number.POSITIVE_INFINITY, // Initial value: maximum distance
      },
    );

    return closest.el?.id;
  }
}

# ngx-magic-scroll
## Signal-based bidirectional scroll spy, anchor sync, and layout compensation for Angular.

## Navigation & Scroll-Management (`shared/navigation`)

Dieses Modul bietet eine robuste, signal-basierte Lösung für synchronisiertes **Scroll-Tracking (Scroll-Spy)**, **bidirektionale URL-Fragment-Synchronisation (`#anchor-id`)**, **asynchrones Initial-Scrollen** und **Resize-Stabilität** in Angular-Anwendungen.

---

### Inhaltsverzeichnis
1. [Übersicht & Funktionsweise](#übersicht--funktionsweise)
2. [Warum nicht Angulars eingebaute Scroll-Funktionalität?](#warum-nicht-angulars-eingebaute-scroll-funktionalität)
3. [Vergleich mit bestehenden Bibliotheken & Alleinstellungsmerkmale (USP)](#vergleich-mit-bestehenden-bibliotheken--alleinstellungsmerkmale-usp)
4. [Architektur & Enthaltene Komponenten](#architektur--enthaltene-komponenten)
5. [Konfiguration & Verwendung](#konfiguration--verwendung)
6. [Abhängigkeiten (Dependencies & Entkopplungs-Leitfaden)](#abhängigkeiten-dependencies--entkopplungs-leitfaden)
7. [Verbesserungsmöglichkeiten & Roadmap](#verbesserungsmöglichkeiten--roadmap)

---

### Übersicht & Funktionsweise

Das Modul löst vier typische Herausforderungen moderner Single-Page-Applications (SPAs):
1. **Bidirektionale URL-Fragment-Synchronisation:** Beim Scrollen durch längere Ansichten oder Listen wird automatisch das oberste sichtbare Element erkannt und die Browser-URL lautlos (`replaceUrl: true`) mit dem passenden `#fragment` aktualisiert.
2. **Asynchrones Deep-Linking / Initial-Scroll:** Wird eine URL mit Fragment aufgerufen (z. B. `/antraege#antrag-card-42`), wartet das System auf das Laden asynchroner Daten (z. B. via TanStack Query), bis das Element tatsächlich im DOM existiert, und scrollt erst dann verzögerungsfrei an die richtige Stelle.
3. **Container-Unabhängigkeit:** Funktioniert nahtlos in verschachtelten, scrollbaren Containern (`overflow-y: auto / scroll`), nicht nur auf `window` oder `document.body`.
4. **Header- und Resize-Kompensation:** Berücksichtigt dynamisch die Höhe fixierter/sticky Header und hält den sichtbaren Anker auch bei Fenstergrößenänderungen stabil im Blickfeld.

---

### Warum nicht Angulars eingebaute Scroll-Funktionalität?

Angular bietet über den Router Mechanismen wie `anchorScrolling: 'enabled'`, `scrollPositionRestoration: 'enabled'` und den `ViewportScroller`. Diese reichen in komplexeren Webanwendungen aus folgenden Gründen meist nicht aus:

| Problembereich | Angular Built-in (`ViewportScroller` / Router) | `shared/navigation` Lösung |
| :--- | :--- | :--- |
| **Asynchrone Daten** | Scrollt synchron unmittelbar beim Routenwechsel. Wenn Daten via API/Query geladen werden, existiert das Zielelement noch nicht im DOM; der Scroll-Vorgang schlägt stillschweigend fehl. | `ScrollToFragmentOnFirstDataDirective` wartet reaktiv auf die Datenverfügbarkeit und scrollt erst nach dem Render-Tick. |
| **Scroll-Spy (2-Wege)** | Kein nativer Mechanismus. URL-Fragmente aktualisieren sich beim manuellen Scrollen nicht automatisch. | `NearestAnchorScrollHook` erkennt beim Scrollen das nächste Element und aktualisiert via `linkedRouteFragment` die URL ohne History-Spam. |
| **Scroll-Container** | Beschränkt sich primär auf `window` / `document.body`. Verschachtelte `div`-Container mit `overflow-y: auto` werden nicht unterstützt. | `injectScrollableParentElement` findet rekursiv den nächsten übergeordneten Scroll-Container im DOM. |
| **Sticky/Fixed Header** | Standard-Anchor-Scrolling springt zur absoluten Oberkante des Viewports; Zielelemente werden oft vom fixen Header verdeckt. | `NearestAnchorProvider` und `ScrollService` ziehen die dynamisch ermittelte Header-Höhe und Offsets ab. |
| **Fenstergrößenänderung** | Beim Resize des Viewports verschiebt sich der Inhalt relativ zum Viewport. | `PreserveVisibleAnchorOnResize` korrigiert die Position bei `window:resize` sofort auf den aktuellen Anker. |

---

### Vergleich mit bestehenden Bibliotheken & Alleinstellungsmerkmale (USP)

Eine Marktanalyse existierender Angular-Lösungen zeigt, dass keine der am Markt verfügbaren Bibliotheken diesen ganzheitlichen Funktionsumfang auf Basis moderner Angular-Signals abdeckt:

#### 1. Bestehende Bibliotheken im Überblick
* **Scroll-Spy-Bibliotheken (z. B. `ngx-scroll-spy`, `@thisissoon/angular-scrollspy`, `@farris/ui-scrollspy`):**
  * *Fokus:* Erkennen, welcher Bereich sich im Viewport befindet (meist zur visuellen Hervorhebung von Navigationsmenüs).
  * *Grenzen:* Veraltete Architektur (RxJS / `@HostListener`, oft noch `NgModule`), keine bidirektionale Router-Synchronisation (`replaceUrl`), beschränkt auf das globale `window`.
* **Scroll-To-Bibliotheken (z. B. `ngx-page-scroll`, `@nicky-lenaers/ngx-scroll-to`):**
  * *Fokus:* Programmatische Einweg-Animationen (z. B. Smooth Scroll bei Button-Klick).
  * *Grenzen:* Keine kontinuierliche Anker-Erkennung, keine Reaktivität für asynchrone Daten.
* **Angular CDK (`@angular/cdk/scrolling`):**
  * *Fokus:* Low-Level-Infrastruktur (`ScrollDispatcher`, `ViewportRuler`, Virtual Scrolling).
  * *Grenzen:* Bietet Basisevents, jedoch keine fertige Anker-Ermittlung, keine Header-Kompensation und keine Router-Integration.
* **Moderne Signal-Utilities (z. B. `ngxtension`):**
  * *Fokus:* Isolierte Signal-Helfer (z. B. `injectRouteFragment()`).
  * *Grenzen:* Bietet nützliche Primitive, aber kein integriertes System für Geometrieberechnung, Scroll-Container und Scroll-Spy.

#### 2. Feature-Vergleichsmatrix

| Feature / Anforderung | Typische Scroll-Spy-Libs | Angular Router / CDK | `shared/navigation` (`ngx-magic-scroll`) |
| :--- | :---: | :---: | :---: |
| **Angular Signals Native (v19+)** | ❌ (RxJS / `@Input`) | ⚠️ (teilweise Signals) | ✅ (`linkedSignal`, Signal Inputs/Outputs) |
| **Bidirektionale URL-Fragment-Sync** | ❌ | ❌ (nur Einweg `anchorScrolling`) | ✅ (`linkedRouteFragment` mit `replaceUrl`) |
| **Asynchrones Deep-Linking** (Warten auf Query/Daten) | ❌ | ❌ (scheitert bei async Daten) | ✅ (`ScrollToFragmentOnFirstDataDirective`) |
| **Data-Change Re-Scrolling** | ❌ | ❌ | ✅ (`ScrollToFragmentOnDataChangeDirective`) |
| **Automatische Container-Erkennung** (`overflow: auto/scroll`) | ❌ (meist nur `window`) | ⚠️ (`ScrollDispatcher` vorhanden) | ✅ (`injectScrollableParentElement`) |
| **Dynamischer Sticky-Header-Ausgleich** | ⚠️ (nur statische Pixel-Offsets) | ❌ | ✅ (`injectedHeaderHeight` via Selektor) |
| **Resize-Stabilität** | ❌ | ❌ | ✅ (`PreserveVisibleAnchorOnResize`) |

#### 3. Alleinstellungsmerkmale (USP)
1. **Ganzheitlicher Workflow statt isolierter Helfer:** Scroll-Spy, programmatisches Scrollen, Header-Ausgleich und bidirektionale Router-Synchronisation greifen ohne Glue-Code ineinander.
2. **SPA-Realität gelöst:** Löst verlässlich die realen Randfälle moderner Business-Anwendungen (asynchrones Datenladen via TanStack/HTTP, verschachtelte Scroll-Container, fixe Header, Fenstergrößenänderungen).
3. **Moderne Signal-First & Zoneless-Architektur:** Entwickelt für moderne Angular-Generationen ohne Altlasten (`linkedSignal`, Signal Queries, minimale Rerenderings).

---

### Architektur & Enthaltene Komponenten

```
src/app/shared/navigation/
├── inject-header-size.ts                    # Dynamische Höhenberechnung von Headern via CSS-Selektor
├── inject-scrollable-parent.ts              # Rekursive Ermittlung des nächsten scrollbaren Eltern-Elements
├── linked-route-fragment.ts                 # WritableSignal für das URL-Fragment mit automatischer URL-Synchronisation
├── nearest-anchor.provider.ts               # Algorithmus zur Distanzberechnung und Auswahl des obersten Ankers
├── nearest-anchor-scroll-hook.ts            # Direktive: Lauscht auf Scroll-Events und emittiert den nächsten Anker
├── preserve-visible-anchor-on-resize.directive.ts # Hält den aktiven Anker bei Viewport-Resize im Sichtbereich
├── scroll-service.ts                        # Zentraler Service für programmatisches Scrollen mit Offsets und In-View-Checks
├── scroll-to-fragment-on-data-change.directive.ts # Re-Scrollt bei nachfolgenden Datenänderungen zum Fragment
└── scroll-to-fragment-on-first-data.directive.ts  # Einmaliges Scrollen zum Fragment nach erstem Datenload
```

---

### Konfiguration & Verwendung

#### 1. Provider registrieren
`NearestAnchorProvider` besitzt **kein** `{ providedIn: 'root' }`. Er muss in der Anwendungs-Konfiguration (`app.config.ts`) oder auf Komponentenebene registriert werden:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { NearestAnchorProvider } from './shared/navigation/nearest-anchor.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    NearestAnchorProvider,
    // ... weitere Provider
  ]
};
```

#### 2. Verwendung in einer Listen-/Detailkomponente

```ts
// antrag-liste.component.ts
import { Component, inject } from '@angular/core';
import {
  NearestAnchorScrollHook,
  PreserveVisibleAnchorOnResize,
  linkedRouteFragment,
  ScrollToFragmentOnFirstDataDirective
} from '../shared/navigation';

@Component({
  selector: 'app-antrag-liste',
  standalone: true,
  imports: [
    NearestAnchorScrollHook,
    ScrollToFragmentOnFirstDataDirective
  ],
  hostDirectives: [PreserveVisibleAnchorOnResize],
  templateUrl: './antrag-liste.component.html'
})
export class AntragListeComponent {
  // Bidirektionales Fragment-Signal (#antrag-card-123)
  protected readonly routeFragment = linkedRouteFragment();

  // Beispiel: TanStack Infinite Query
  protected readonly antragQuery = injectAntragInfiniteQuery();

  protected readonly FRAGMENT_PREFIX = 'antrag-card-';
}
```

```html
<!-- antrag-liste.component.html -->
<div 
  class="scroll-container"
  [appNearestAnchorScrollHook]
  (appNearestAnchorScrollHook)="routeFragment.set($event)"
  [selectorPrefix]="FRAGMENT_PREFIX"
  [debounceTime]="400"
  [appScrollingOnFirstData]="antragQuery"
  [onlyOnceScrollBehavior]="'instant'"
  [onlyOnceTopOffset]="20"
>
  @for (antrag of antragQuery.data()?.pages?.flat(); track antrag.id) {
    <div 
      class="card-item" 
      [id]="FRAGMENT_PREFIX + antrag.id"
    >
      <h3>Antrag #{{ antrag.id }}</h3>
      <p>{{ antrag.title }}</p>
    </div>
  }
</div>
```

---

### Abhängigkeiten (Dependencies & Entkopplungs-Leitfaden)

Um das Modul in eine eigenständige Bibliothek auszulagern oder Abhängigkeiten schrittweise abzubauen, sind hier alle externen und internen Kopplungen dokumentiert:

#### 1. `@ddtmm/angular-signal-generators`
- **Verwendet in:** `src/lib/navigation/nearest-anchor-scroll-hook.ts` (`debounceSignal`)
- **Zweck:** Entprellung von Scroll-Events, um Performance-Einbußen beim schnellen Scrollen zu verhindern.
- **Entfernungs-/Ersatz-Strategie:**
  - **Angular v22:** Nutzt die native Unterstützung für Signal-Debouncing / Signal-Operatoren (`debounceSignal` / `rxResource`).
  - **Vor Angular v22:** Ersatz durch ein einfaches Hilfssignal mit `toSignal(toObservable(scrollEvent$).pipe(debounceTime(300)))` oder RxJS `rxMethod`.

#### 2. `@tanstack/angular-query-experimental`
- **Verwendet in:** `src/lib/navigation/scroll-to-fragment-on-first-data.directive.ts` und `scroll-to-fragment-on-data-change.directive.ts`
- **Zweck:** Direkte Typbindung an `CreateInfiniteQueryResult<any>` zum Auslesen von `.data()` und `.isLoading()`.
- **Entfernungs-/Ersatz-Strategie:**
  - Entkopplung der Direktiven von TanStack: Umstellung des Inputs auf generische Datenbereitschaft:
    ```ts
    // Statt CreateInfiniteQueryResult:
    public readonly isReady = input<boolean>(false); 
    // oder
    public readonly data = input<unknown>();
    public readonly isLoading = input<boolean>(false);
    ```
  - Damit werden die Direktiven framework-agnostisch und funktionieren mit Angular `httpResource`, TanStack Query, RxJS Observables oder Signals gleichermaßen.

#### 3. `ngxtension`
- **Verwendet in:**
  - `src/lib/navigation/scroll-to-fragment-on-first-data.directive.ts`: `injectRouteFragment()`, `effectOnceIf()`
  - `src/lib/navigation/scroll-to-fragment-on-data-change.directive.ts`: `injectRouteFragment()`
- **Zweck:** Auslesen des Route-Fragments als Signal und Ausführen von Einmal-Effekten.
- **Entfernungs-/Ersatz-Strategie:**
  - `injectRouteFragment`: Kann vollständig durch `toSignal(inject(ActivatedRoute).fragment)` oder das interne `linkedRouteFragment()` ersetzt werden.
  - `effectOnceIf`: Kann durch `effectIf` (aus `src/app/shared/effects/effect-if.ts`) in Kombination mit einem einfachen Boolean-Flag oder `effectRef.destroy()` ersetzt werden.

#### 4. Interne Abhängigkeit: `src/app/shared/effects/effect-skip-first-if.ts`
- **Verwendet in:** `src/lib/navigation/scroll-to-fragment-on-data-change.directive.ts`
- **Hinweis:** Beim Kopieren oder Auslagern des Moduls muss `effect-skip-first-if.ts` mitgenommen oder in den Navigationsordner integriert werden.

---

### Verbesserungsmöglichkeiten & Roadmap

Folgende Punkte bieten Optimierungspotenzial für künftige Refactorings:

1. **Konfigurierbarer Header-Selektor:**
   - *Aktueller Stand:* In `NearestAnchorScrollHook` ist `headerSelector: '.header'` fest verdrahtet.
   - *Verbesserung:* Bereitstellung über einen optionalen Input `[headerSelector]="'.custom-header'"` oder ein `InjectionToken<string>('HEADER_SELECTOR')`.

2. **Ablösung von `setTimeout` im `ScrollService`:**
   - *Aktueller Stand:* In `ScrollService` wird bei `behavior: 'smooth'` ein harter `setTimeout(..., 500)` verwendet, um das Offset nach dem ScrollIntoView nachzuziehen.
   - *Verbesserung:* Verwenden von `scrollend`-Event-Listenern oder `ResizeObserver` / `requestAnimationFrame`, um Verzögerungen exakt an die Animation zu koppeln.

3. **IntersectionObserver als Alternative / Ergänzung:**
   - *Aktueller Stand:* Berechnung über regelmäßige `getBoundingClientRect()`-Aufrufe im debouncten `scroll`-Event.
   - *Verbesserung:* Einsatz der `IntersectionObserver`-API mit `rootMargin` für noch performantere Sichtbarkeitsprüfungen ohne manuelle DOM-Geometrie-Abfragen im Scroll-Handler.

4. **Einheitlicher Provider-Helper:**
   - *Aktueller Stand:* `NearestAnchorProvider` muss manuell in Provider-Arrays eingetragen werden.
   - *Verbesserung:* `provideNavigationScrolling()`-Hilfsfunktion oder Setzen von `{ providedIn: 'root' }`.

5. **Entkopplung der Daten-Direktiven:**
   - Vollständiges Entfernen von `@tanstack/angular-query-experimental` aus den Direktiven, um eine universelle Wiederverwendbarkeit zu gewährleisten.

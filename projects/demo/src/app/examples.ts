import { Component, ElementRef, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { delay, of } from 'rxjs';
import { ScrollOptionsPanel, VisibilityMode } from './scroll-options';
import {
  linkedRouteFragment,
  NearestAnchorProvider,
  NearestAnchorScrollHook,
  PreserveVisibleAnchorOnResize,
  ScrollService,
  ScrollToFragmentOnFirstDataDirective,
  ScrollToFragmentOnDataChangeDirective,
} from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [NearestAnchorScrollHook, ScrollOptionsPanel],
  providers: [NearestAnchorProvider],
  template: `<h1>Dokument · Anker synchronisieren</h1>
    <p>Scrollen aktualisiert den aktiven Abschnitt und das URL-Fragment.</p>
    <app-scroll-options
      [(behavior)]="behavior"
      [(offset)]="offset"
      [(visibility)]="visibility"
      [(debounceTime)]="debounceTime"
      [(onlyPrefixed)]="onlyPrefixed"
      [showVisibility]="true"
      [showSpy]="true"
    />
    <p role="status" aria-label="Scroll-Ergebnis">{{ result() }}</p>
    <nav aria-label="Abschnitte">
      @for (id of sections; track id) {
        <button (click)="jump(id)">{{ id }}</button>
      }
    </nav>
    <p>
      Aktiver Anker: <output>{{ fragment() }}</output>
    </p>
    <div class="viewport" #viewport>
      <div
        appNearestAnchorScrollHook
        [selectorPrefix]="onlyPrefixed() ? 'kapitel-' : ''"
        [debounceTime]="debounceTime()"
        headerSelector=""
        [headerOffset]="offset()"
        (appNearestAnchorScrollHook)="fragment.set($event)"
      >
        @for (id of sections; track id) {
          <section [id]="id">
            <h2>{{ id }}</h2>
            <h3 [id]="'zwischen-' + id">Zwischenüberschrift</h3>
            <p>Ein vertikal scrollbares Dokument mit stabilen Abschnittsankern.</p>
          </section>
        }
      </div>
    </div>`,
})
export class DocumentExample {
  readonly sections = ['kapitel-1', 'kapitel-2', 'kapitel-3', 'kapitel-4', 'kapitel-5'];
  readonly fragment = linkedRouteFragment();
  readonly behavior = signal<ScrollBehavior>('instant');
  readonly offset = signal(0);
  readonly visibility = signal<VisibilityMode>('none');
  readonly debounceTime = signal(500);
  readonly onlyPrefixed = signal(true);
  readonly result = signal('Ein Ziel wählen oder im Dokument scrollen.');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scroll = inject(ScrollService);
  jump(id: string) {
    const executed = this.scroll.scroll(id, {
      scrollable: this.host.nativeElement.querySelector<HTMLElement>('.viewport')!,
      topOffset: this.offset(),
      behavior: this.behavior(),
      ignoreWhenInView: this.visibility(),
    });
    this.result.set(
      executed ? 'Scrollen ausgeführt.' : 'Scrollen übersprungen: Das Ziel ist bereits sichtbar.',
    );
  }
}

@Component({
  imports: [
    RouterLink,
    ScrollOptionsPanel,
    NearestAnchorScrollHook,
    ScrollToFragmentOnFirstDataDirective,
    PreserveVisibleAnchorOnResize,
  ],
  providers: [NearestAnchorProvider],
  template: `<h1>Navigation · Position restaurieren</h1>
    <p>
      Ein Detail öffnen und mit dem Browser zurückkehren. Die Liste lädt erneut asynchron und
      restauriert den Anker.
    </p>
    <app-scroll-options
      [behavior]="behavior()"
      [offset]="offset()"
      (behaviorChange)="setOptions($event, offset())"
      (offsetChange)="setOptions(behavior(), $event)"
    />
    <p>Die gewählten Optionen bleiben bei Detailnavigation und Reload in der URL erhalten.</p>
    <div class="viewport">
      <div
        appNearestAnchorScrollHook
        selectorPrefix="eintrag-"
        headerSelector=""
        [headerOffset]="offset()"
        (appNearestAnchorScrollHook)="fragment.set($event)"
        [appScrollingOnFirstData]="source"
        [onlyOnceScrollBehavior]="behavior()"
        [onlyOnceTopOffset]="offset()"
        appPreserveVisibleAnchorOnResize
        [topOffset]="offset()"
        preserveSelectorPrefix="eintrag-"
      >
        @if (resource.isLoading()) {
          <p role="status">Lädt…</p>
        }
        @for (id of resource.value(); track id) {
          <section [id]="'eintrag-' + id">
            <h2>Eintrag {{ id }}</h2>
            <a [routerLink]="['/navigation/detail', id]" queryParamsHandling="preserve"
              >Details zu {{ id }}</a
            >
          </section>
        }
      </div>
    </div>`,
})
export class NavigationExample {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly behavior = signal<ScrollBehavior>(
    this.route.snapshot.queryParamMap.get('scroll') === 'smooth'
      ? 'smooth'
      : this.route.snapshot.queryParamMap.get('scroll') === 'auto'
        ? 'auto'
        : 'instant',
  );
  readonly offset = signal(Number(this.route.snapshot.queryParamMap.get('offset')) || 0);
  setOptions(behavior: ScrollBehavior, offset: number) {
    this.behavior.set(behavior);
    this.offset.set(offset);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { scroll: behavior, offset },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }
  readonly fragment = linkedRouteFragment();
  readonly resource = rxResource({ stream: () => of([1, 2, 3, 4, 5, 6, 7, 8]).pipe(delay(150)) });
  readonly source = { data: () => this.resource.value(), isLoading: this.resource.isLoading };
}

@Component({
  imports: [RouterLink],
  template: `<h1>Details zu {{ id }}</h1>
    <p>Die Listenposition befindet sich im Fragment des vorherigen Verlaufseintrags.</p>
    <a [routerLink]="listPath" [fragment]="prefix + id" queryParamsHandling="preserve"
      >Zur Liste</a
    >`,
})
export class DetailExample {
  private readonly route = inject(ActivatedRoute);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly listPath = this.route.snapshot.routeConfig?.path?.startsWith('drawer')
    ? '/drawer'
    : '/navigation';
  readonly prefix = this.listPath === '/drawer' ? 'antrag-card-' : 'eintrag-';
}

@Component({
  imports: [
    MatSidenavModule,
    RouterLink,
    ScrollOptionsPanel,
    NearestAnchorScrollHook,
    ScrollToFragmentOnFirstDataDirective,
    ScrollToFragmentOnDataChangeDirective,
    PreserveVisibleAnchorOnResize,
  ],
  providers: [NearestAnchorProvider],
  styles: ['mat-drawer-content { overflow-anchor: none; }'],
  template: `<h1>Antragsübersicht · Material Drawer</h1>
    <p>
      Nach dem Muster der AntraegeUebersichtContainer: asynchrone Karten, Nachladen und
      Detailnavigation.
    </p>
    <app-scroll-options [(behavior)]="behavior" [(offset)]="offset" />
    <label
      ><input
        type="checkbox"
        [checked]="restoreChanges()"
        (change)="restoreChanges.set(!restoreChanges())"
      />Anker bei Datenänderungen erhalten</label
    >
    <button (click)="prepend.update(addThree)">Drei Anträge oben einfügen</button>
    <button (click)="drawer.toggle()">Navigation umschalten</button>
    <button (click)="loadMore()">Weitere Anträge laden</button>
    <button (click)="resource.reload()">Daten neu laden</button>
    <mat-drawer-container class="drawer-shell">
      <mat-drawer #drawer mode="side" opened
        ><nav aria-label="Anträge">
          @for (id of resource.value(); track id) {
            <button (click)="jump(id)">Antrag {{ id }}</button>
          }
        </nav></mat-drawer
      >
      <mat-drawer-content
        ><div
          appNearestAnchorScrollHook
          selectorPrefix="antrag-card-"
          headerSelector=""
          [headerOffset]="offset()"
          (appNearestAnchorScrollHook)="fragment.set($event)"
          [appScrollingOnFirstData]="source"
          [onlyOnceScrollBehavior]="behavior()"
          [onlyOnceTopOffset]="offset()"
          [appScrollingOnDataChange]="changesSource"
          [skipFirstScrollBehavior]="behavior()"
          [skipFirstTopOffset]="offset()"
          appPreserveVisibleAnchorOnResize
          [topOffset]="offset()"
          preserveSelectorPrefix="antrag-card-"
        >
          @if (resource.isLoading()) {
            <p role="status">Anträge laden…</p>
          }
          @for (id of resource.value(); track id) {
            <section [id]="'antrag-card-' + id">
              <h2>Antrag {{ id }}</h2>
              <p>Hausanschluss · Bearbeitung offen</p>
              <details>
                <summary>Antrag aufklappen</summary>
                <p>Kontakt und Anschlussdaten für Antrag {{ id }}</p>
              </details>
              <a [routerLink]="['/drawer/detail', id]" queryParamsHandling="preserve"
                >Antrag {{ id }} öffnen</a
              >
            </section>
          }
        </div></mat-drawer-content
      >
    </mat-drawer-container>`,
})
export class DrawerExample {
  readonly behavior = signal<ScrollBehavior>('instant');
  readonly offset = signal(0);
  readonly restoreChanges = signal(true);
  readonly prepend = signal(0);
  readonly addThree = (count: number) => count + 3;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly fragment = linkedRouteFragment();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly count = signal(
    Math.max(8, Math.min(100, Number(this.route.snapshot.queryParamMap.get('count')) || 8)),
  );
  loadMore() {
    this.count.update((count) => Math.min(100, count + 4));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { count: this.count() },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }
  readonly resource = rxResource({
    params: () => ({ count: this.count(), prepend: this.prepend() }),
    stream: ({ params }) =>
      of([
        ...Array.from({ length: params.prepend }, (_, i) => i - params.prepend),
        ...Array.from({ length: params.count }, (_, i) => i + 1),
      ]).pipe(delay(150)),
  });
  readonly source = { data: () => this.resource.value(), isLoading: this.resource.isLoading };
  readonly changesSource = {
    data: () => (this.restoreChanges() ? this.resource.value() : undefined),
    isLoading: this.resource.isLoading,
  };
  private readonly scroll = inject(ScrollService);
  jump(id: number) {
    this.fragment.set('antrag-card-' + id);
    this.scroll.scroll('antrag-card-' + id, {
      scrollable: this.host.nativeElement.querySelector<HTMLElement>('mat-drawer-content')!,
      topOffset: this.offset(),
      behavior: this.behavior(),
    });
  }
}

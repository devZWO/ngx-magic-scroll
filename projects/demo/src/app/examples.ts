import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { delay, map, of, timer } from 'rxjs';
import { ScrollOptionsPanel, VisibilityMode } from './scroll-options';
import { MagicScrollDirective, provideMagicScroll } from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [MagicScrollDirective, ScrollOptionsPanel],
  providers: [provideMagicScroll({ anchorPrefix: 'kapitel-' })],
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
      Aktiver Anker: <output>{{ scroll.activeAnchor() }}</output>
    </p>
    <div class="viewport" #viewport>
      <div magicScroll #scroll="magicScroll" [scrollOptions]="options()">
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
  readonly behavior = signal<ScrollBehavior>('instant');
  readonly offset = signal(0);
  readonly visibility = signal<VisibilityMode>('none');
  readonly debounceTime = signal(500);
  readonly onlyPrefixed = signal(true);
  readonly result = signal('Ein Ziel wählen oder im Dokument scrollen.');
  private readonly scroll = viewChild.required(MagicScrollDirective);
  readonly options = computed(() => ({
    behavior: { interaction: this.behavior() },
    headerOffset: this.offset(),
    ignoreWhenInView: this.visibility(),
    debounceTime: this.debounceTime(),
    anchorPrefix: this.onlyPrefixed() ? undefined : '',
  }));
  jump(id: string) {
    const executed = this.scroll().scrollTo(id);
    this.result.set(
      executed ? 'Scrollen ausgeführt.' : 'Scrollen übersprungen: Das Ziel ist bereits sichtbar.',
    );
  }
}

@Component({
  imports: [RouterLink, ScrollOptionsPanel, MagicScrollDirective],
  providers: [provideMagicScroll({ anchorPrefix: 'eintrag-' })],
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
    <details>
      <summary>Ladeverhalten</summary>
      <label
        >Ladezeit (ms)<input
          type="number"
          min="0"
          max="5000"
          [value]="loadDelay()"
          (input)="loadDelay.set(+$any($event.target).value)"
      /></label>
      <label
        >Ladeergebnis<select
          [value]="loadResult()"
          (change)="loadResult.set($any($event.target).value)"
        >
          <option value="data">Einträge</option>
          <option value="empty">Leere Liste</option>
          <option value="error">Ladefehler</option>
        </select></label
      >
      <button (click)="resource.reload()">Liste neu laden</button>
    </details>
    <div class="viewport">
      <div magicScroll [scrollSource]="resource" [scrollOptions]="options()">
        @if (resource.isLoading()) {
          <p role="status">Lädt…</p>
        }
        @if (resource.error()) {
          <p role="alert">Die Liste konnte nicht geladen werden. Bitte erneut versuchen.</p>
        }
        @if (resource.hasValue() && resource.value().length === 0) {
          <p role="status">Keine Einträge.</p>
        }
        @for (id of entries(); track id) {
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
  readonly loadDelay = signal(
    Math.max(0, Math.min(5000, Number(this.route.snapshot.queryParamMap.get('delay')) || 150)),
  );
  readonly loadResult = signal(this.route.snapshot.queryParamMap.get('result') ?? 'data');
  readonly resource = rxResource({
    stream: () => {
      const result = this.loadResult();
      return timer(this.loadDelay()).pipe(
        map(() => {
          if (result === 'error') throw new Error('Demo-Ladefehler');
          return result === 'empty' ? [] : [1, 2, 3, 4, 5, 6, 7, 8];
        }),
      );
    },
  });
  readonly entries = () => (this.resource.hasValue() ? this.resource.value() : []);
  readonly options = computed(() => ({
    behavior: { restoration: this.behavior(), interaction: this.behavior() },
    headerOffset: this.offset(),
  }));
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
  imports: [MatSidenavModule, RouterLink, ScrollOptionsPanel, MagicScrollDirective],
  providers: [provideMagicScroll({ anchorPrefix: 'antrag-card-' })],
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
        ><div magicScroll [scrollSource]="resource" [scrollOptions]="options()">
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
  private readonly scroll = viewChild.required(MagicScrollDirective);
  readonly options = computed(() => ({
    behavior: { restoration: this.behavior(), interaction: this.behavior() },
    headerOffset: this.offset(),
    restoreOnDataChange: this.restoreChanges(),
  }));
  jump(id: number) {
    this.scroll().scrollTo('antrag-card-' + id);
  }
}

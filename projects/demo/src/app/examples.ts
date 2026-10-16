import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDrawerContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { delay, map, of, timer } from 'rxjs';
import { AnchorStrategyOption, ScrollOptionsPanel, VisibilityMode } from './scroll-options';
import { ActiveZoneOverlay } from './active-zone-overlay';
import { ParamHelpButton } from './param-help';
import {
  MagicScrollDirective,
  MagicScrollOptions,
  provideMagicScroll,
  ScrollAnchorDirective,
} from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [
    MagicScrollDirective,
    ScrollAnchorDirective,
    ScrollOptionsPanel,
    ActiveZoneOverlay,
    MatFormFieldModule,
    MatInputModule,
  ],
  providers: [provideMagicScroll({ anchorPrefixes: ['kapitel-'] })],
  template: `<h1>Document · Synchronize anchors</h1>
    <p>Scrolling updates the active section and the URL fragment.</p>
    <app-scroll-options
      [(behavior)]="behavior"
      [(offset)]="offset"
      [(bottomOffset)]="bottomOffset"
      [(activationThreshold)]="activationThreshold"
      [(overlay)]="showOverlay"
      [(visibility)]="visibility"
      [(debounceTime)]="debounceTime"
      [(onlyPrefixed)]="onlyPrefixed"
      [(strategy)]="strategy"
      [(focus)]="focusTransfer"
      [showVisibility]="true"
      [showSpy]="true"
      [showStrategy]="true"
      [showFocusToggle]="true"
    />
    <div class="demo-accessible-banner" role="region" aria-label="Accessibility quick actions">
      <span>Accessible jump actions (with focus):</span>
      <button class="demo-focus-jump-btn" (click)="jumpWithFocus('kapitel-3')">
        Jump to Chapter 3
      </button>
      <button class="demo-focus-jump-btn" (click)="jumpWithFocus('anhang-detail')">
        Jump to Appendix
      </button>
    </div>
    <p role="status" aria-label="Scroll result">{{ result() }}</p>
    <nav aria-label="Sections">
      @for (id of navSections; track id) {
        <button (click)="jump(id)">{{ id }}</button>
      }
    </nav>
    <p>
      Active anchor: <output>{{ scroll.activeAnchor() }}</output>
    </p>
    <div class="viewport" #viewport>
      @if (showOverlay()) {
        <app-active-zone-overlay
          [target]="viewport"
          [headerOffset]="offset()"
          [bottomOffset]="bottomOffset()"
          [activationThreshold]="activationThreshold()"
        />
      }
      <div magicScroll #scroll="magicScroll" [scrollOptions]="options()">
        @for (id of sections; track id) {
          <section [id]="id">
            <h2>{{ id }}</h2>
            <h3 [id]="'zwischen-' + id">Intermediate heading</h3>
            <p>A vertically scrollable document with stable section anchors.</p>
            @if (id === 'kapitel-1') {
              <div [scrollAnchor]="'spezial-notiz'" class="demo-note">
                <p><strong>Explicit scrollAnchor:</strong> Eligible in explicit and all modes.</p>
              </div>
            }
            @if (id === 'kapitel-2') {
              <div id="anhang-detail" class="demo-appendix">
                <p>
                  <strong>Appendix anchor (anhang-):</strong> Eligible in multi-prefix and all
                  modes.
                </p>
              </div>
              <form class="demo-material-form" (submit)="$event.preventDefault()">
                <mat-form-field appearance="outline">
                  <mat-label>Feedback note</mat-label>
                  <input matInput placeholder="Material input with generated ID" />
                </mat-form-field>
              </form>
            }
          </section>
        }
      </div>
    </div>`,
})
export class DocumentExample {
  readonly sections = ['kapitel-1', 'kapitel-2', 'kapitel-3', 'kapitel-4', 'kapitel-5'];
  readonly navSections = [
    'kapitel-1',
    'kapitel-2',
    'kapitel-3',
    'kapitel-4',
    'kapitel-5',
    'anhang-detail',
    'spezial-notiz',
  ];
  readonly behavior = signal<ScrollBehavior>('instant');
  readonly offset = signal(0);
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly showOverlay = signal(false);
  readonly visibility = signal<VisibilityMode>('none');
  readonly debounceTime = signal(500);
  readonly onlyPrefixed = signal(true);
  readonly strategy = signal<AnchorStrategyOption>('prefix');
  readonly focusTransfer = signal(false);
  readonly result = signal('Choose a target or scroll within the document.');
  private readonly scroll = viewChild.required(MagicScrollDirective);
  readonly options = computed<MagicScrollOptions>(() => {
    const strat = this.strategy();
    let selectionConfig: MagicScrollOptions;
    if (strat === 'multi-prefix') {
      selectionConfig = { anchorPrefixes: ['kapitel-', 'anhang-'] };
    } else if (strat === 'explicit') {
      selectionConfig = { anchorSelection: 'explicit' };
    } else if (strat === 'all') {
      selectionConfig = { anchorPrefixes: [''] };
    } else {
      selectionConfig = { anchorPrefixes: ['kapitel-'] };
    }

    return {
      behavior: { interaction: this.behavior() },
      headerOffset: this.offset(),
      bottomOffset: this.bottomOffset(),
      activationThreshold: this.activationThreshold(),
      ignoreWhenInView: this.visibility(),
      debounceTime: this.debounceTime(),
      ...selectionConfig,
    };
  });
  jump(id: string) {
    const executed = this.scroll().scrollTo(id, {
      focus: this.focusTransfer(),
      behavior: this.behavior(),
      ignoreWhenInView: this.visibility(),
    });
    this.result.set(
      executed
        ? this.focusTransfer()
          ? 'Scrolling initiated; focus transfer requested.'
          : 'Scrolling initiated.'
        : this.focusTransfer()
          ? 'Scrolling was not initiated; focus transfer was requested if the target is eligible.'
          : 'Scrolling skipped: the target is not eligible or already visible.',
    );
  }
  jumpWithFocus(id: string) {
    const executed = this.scroll().scrollTo(id, { focus: true, behavior: this.behavior() });
    this.result.set(
      executed
        ? 'Scrolling initiated; focus transfer requested.'
        : 'Scrolling was not initiated; focus transfer was requested if the target is eligible.',
    );
  }
}

@Component({
  imports: [RouterLink, ScrollOptionsPanel, ActiveZoneOverlay, MagicScrollDirective],
  providers: [provideMagicScroll({ anchorPrefixes: ['eintrag-'] })],
  template: `<h1>Navigation · Restore position</h1>
    <p>
      Open a detail page and use the browser to go back. The list loads asynchronously again and
      restores the anchor.
    </p>
    <app-scroll-options
      [behavior]="behavior()"
      [offset]="offset()"
      [(bottomOffset)]="bottomOffset"
      [(activationThreshold)]="activationThreshold"
      [(overlay)]="showOverlay"
      (behaviorChange)="setOptions($event, offset())"
      (offsetChange)="setOptions(behavior(), $event)"
    />
    <p>Selected options remain in the URL across detail navigation and reload.</p>
    <details>
      <summary>Loading behavior</summary>
      <label
        >Loading delay (ms)<input
          type="number"
          min="0"
          max="5000"
          [value]="loadDelay()"
          (input)="loadDelay.set(+$any($event.target).value)"
      /></label>
      <label
        >Loading result<select
          [value]="loadResult()"
          (change)="loadResult.set($any($event.target).value)"
        >
          <option value="data">Entries</option>
          <option value="empty">Empty list</option>
          <option value="error">Loading error</option>
        </select></label
      >
      <button (click)="resource.reload()">Reload list</button>
    </details>
    <div class="viewport" #viewport>
      @if (showOverlay()) {
        <app-active-zone-overlay
          [target]="viewport"
          [headerOffset]="offset()"
          [bottomOffset]="bottomOffset()"
          [activationThreshold]="activationThreshold()"
        />
      }
      <div magicScroll [scrollSource]="resource" [scrollOptions]="options()">
        @if (resource.isLoading()) {
          <p role="status">Loading…</p>
        }
        @if (resource.error()) {
          <p role="alert">The list could not be loaded. Please try again.</p>
        }
        @if (resource.hasValue() && resource.value().length === 0) {
          <p role="status">No entries.</p>
        }
        @for (id of entries(); track id) {
          <section [id]="'eintrag-' + id">
            <h2>Entry {{ id }}</h2>
            <a [routerLink]="['/navigation/detail', id]" queryParamsHandling="preserve"
              >Details for {{ id }}</a
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
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly showOverlay = signal(false);
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
          if (result === 'error') throw new Error('Demo loading error');
          return result === 'empty' ? [] : [1, 2, 3, 4, 5, 6, 7, 8];
        }),
      );
    },
  });
  readonly entries = () => (this.resource.hasValue() ? this.resource.value() : []);
  readonly options = computed(() => ({
    behavior: { restoration: this.behavior(), interaction: this.behavior() },
    headerOffset: this.offset(),
    bottomOffset: this.bottomOffset(),
    activationThreshold: this.activationThreshold(),
  }));
}

@Component({
  imports: [RouterLink],
  template: `<h1>Details for {{ id }}</h1>
    <p>The list position is stored in the fragment of the previous history entry.</p>
    <a [routerLink]="listPath" [fragment]="prefix + id" queryParamsHandling="preserve"
      >Back to list</a
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
    ActiveZoneOverlay,
    MagicScrollDirective,
    ParamHelpButton,
  ],
  providers: [provideMagicScroll({ anchorPrefixes: ['antrag-card-'] })],
  styles: ['mat-drawer-content { overflow-anchor: none; }'],
  template: `<h1>Application overview · Material Drawer</h1>
    <p>
      Inspired by AntraegeUebersichtContainer: asynchronous cards, pagination and detail navigation.
    </p>
    <app-scroll-options
      [(behavior)]="behavior"
      [(offset)]="offset"
      [(bottomOffset)]="bottomOffset"
      [(activationThreshold)]="activationThreshold"
      [(overlay)]="showOverlay"
      [(focus)]="focusTransfer"
      [showFocusToggle]="true"
    />
    <div class="option-item checkbox-item" style="margin-block: 12px">
      <label for="drawer-restore-changes" class="checkbox-label"
        ><input
          id="drawer-restore-changes"
          type="checkbox"
          [checked]="restoreChanges()"
          (change)="restoreChanges.set(!restoreChanges())"
        />Preserve anchor on data changes</label
      >
      <app-param-help paramId="restoreOnDataChange" />
    </div>
    <button (click)="prepend.update(addThree)">Insert three applications at the top</button>
    <button (click)="drawer.toggle()">Toggle navigation</button>
    <button (click)="loadMore()">Load more applications</button>
    <button (click)="resource.reload()">Reload data</button>
    <mat-drawer-container class="drawer-shell">
      <mat-drawer #drawer mode="side" opened
        ><nav aria-label="Applications">
          @for (id of resource.value(); track id) {
            <button (click)="jump(id)">Application {{ id }}</button>
          }
        </nav></mat-drawer
      >
      <mat-drawer-content #drawerContent>
        @if (showOverlay()) {
          <app-active-zone-overlay
            [target]="drawerContentElement()"
            [headerOffset]="offset()"
            [bottomOffset]="bottomOffset()"
            [activationThreshold]="activationThreshold()"
          />
        }
        <div magicScroll [scrollSource]="resource" [scrollOptions]="options()">
          @if (resource.isLoading()) {
            <p role="status">Loading applications…</p>
          }
          @for (id of resource.value(); track id) {
            <section [id]="'antrag-card-' + id">
              <h2>Application {{ id }}</h2>
              <p>Utility connection · Pending processing · Reference #{{ id }}</p>
              <details>
                <summary>View extended specifications and timeline</summary>
                <div class="details-content">
                  <p>
                    Technical review in progress for electrical grid integration, meter
                    installation, and low-voltage distribution feeder connection.
                  </p>
                  <p>
                    Documents submitted: Grid layout schematics, certified contractor documentation,
                    compliance inspection certificates, and structural clearance notes.
                  </p>
                  <p>
                    Phase 1 (Completed): Initial site survey and connection capacity calculation.
                  </p>
                  <p>
                    Phase 2 (In Review): Cable route planning, sub-distribution panel sizing, and
                    safety disconnect coordination.
                  </p>
                  <p>
                    Phase 3 (Scheduled): Field technician inspection, smart meter commissioning, and
                    formal grid activation.
                  </p>
                  <p>
                    <em>Reading Position Note:</em> When scrolling halfway through this card,
                    automatic reflows (such as inserting applications at the top) preserve your
                    relative reading offset without jumping back to the heading.
                  </p>
                </div>
              </details>
              <a [routerLink]="['/drawer/detail', id]" queryParamsHandling="preserve"
                >Open application {{ id }}</a
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
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly showOverlay = signal(false);
  readonly restoreChanges = signal(true);
  readonly focusTransfer = signal(false);
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
  private readonly drawerContent = viewChild(MatDrawerContent, { read: ElementRef });
  readonly drawerContentElement = computed<HTMLElement | null>(
    () => this.drawerContent()?.nativeElement ?? null,
  );
  readonly options = computed(() => ({
    behavior: { restoration: this.behavior(), interaction: this.behavior() },
    headerOffset: this.offset(),
    bottomOffset: this.bottomOffset(),
    activationThreshold: this.activationThreshold(),
    restoreOnDataChange: this.restoreChanges(),
  }));
  jump(id: number) {
    this.scroll().scrollTo('antrag-card-' + id, { focus: this.focusTransfer() });
  }
}

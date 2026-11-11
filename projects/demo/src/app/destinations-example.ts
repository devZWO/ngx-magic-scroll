import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { MagicScrollDirective, provideMagicScroll } from '@devzwo/ngx-magic-scroll';

/** Simulated duration of an overlay closing animation; longer than the default 500 ms debounce. */
const OVERLAY_CLOSE_DELAY = 700;

@Component({
  imports: [MagicScrollDirective, RouterLink],
  providers: [provideMagicScroll({ anchorPrefixes: ['ziel-'] })],
  styles: `
    .demo-intro {
      min-height: 600px;
    }
    .demo-tall {
      min-height: 700px;
    }
    .demo-contact {
      min-height: 200px;
    }
    .demo-end {
      min-height: 160px;
    }
    .demo-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-block: 0.5rem;
    }
  `,
  template: `<h1>Destinations · Keep deliberate targets</h1>
    <p>
      A destination you navigate to stays in the URL while it is visible, even if it cannot reach
      the top of the viewport: the short last section, or a tall section whose nested anchor would
      otherwise win. Scrolling yourself releases it.
    </p>
    <nav aria-label="Table of contents">
      <span>Links (add history entries):</span>
      @for (id of sections; track id) {
        <a routerLink="." [fragment]="id" queryParamsHandling="preserve">{{ id }}</a>
      }
    </nav>
    <p>
      URL fragment: <output aria-label="URL fragment">{{ scroll.activeAnchor() }}</output> · History
      entries: <output aria-label="History entries">{{ historyLength() }}</output>
    </p>

    <div class="demo-panel" role="group" aria-label="Scroll-spy publication">
      <label>
        <input type="checkbox" [checked]="paused()" (change)="togglePause()" />
        Pause URL publication (<code>suspendPublication()</code>)
      </label>
      <button type="button" (click)="discard()">
        Discard pending update (<code>discardPendingPublication()</code>)
      </button>
    </div>

    <div class="demo-panel" role="group" aria-label="Orchestrated navigation">
      <label>
        <input type="checkbox" [checked]="protectFlow()" (change)="protectFlow.set(!protectFlow())" />
        Protect with <code>suspendPublication()</code>
      </label>
      <button type="button" [disabled]="flowRunning()" (click)="openContactViaOverlay()">
        Open contact via overlay
      </button>
    </div>
    <p role="status" aria-label="Publication result">{{ result() }}</p>

    <div class="viewport">
      <div magicScroll #scroll="magicScroll">
        <section id="ziel-einleitung" class="demo-intro">
          <h2>ziel-einleitung</h2>
          <p>Start here, then try “Open contact via overlay” and press the browser Back button.</p>
        </section>
        <section id="ziel-projekte" class="demo-tall">
          <h2>ziel-projekte</h2>
          <h3 id="ziel-projekte-liste">Nested anchor: ziel-projekte-liste</h3>
          <p>
            This section is taller than the viewport. Navigating to it keeps
            <code>ziel-projekte</code> although its nested anchor is fully visible.
          </p>
        </section>
        <section id="ziel-kontakt" class="demo-contact">
          <h2>ziel-kontakt</h2>
          <p>The overlay flow navigates here.</p>
        </section>
        <section id="ziel-ende" class="demo-end">
          <h2>ziel-ende</h2>
          <p>The last section cannot scroll to the top; it still stays the destination.</p>
        </section>
      </div>
    </div>`,
})
export class DestinationsExample {
  readonly sections = ['ziel-einleitung', 'ziel-projekte', 'ziel-kontakt', 'ziel-ende'];
  readonly paused = signal(false);
  readonly protectFlow = signal(true);
  readonly flowRunning = signal(false);
  readonly result = signal('Navigate with the links or scroll the document.');
  readonly historyLength = signal(0);
  private readonly scroll = viewChild.required(MagicScrollDirective);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly window = inject(DOCUMENT).defaultView;
  private resumePublication?: () => void;

  constructor() {
    this.updateHistoryLength();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updateHistoryLength());
    inject(DestroyRef).onDestroy(() => this.resumePublication?.());
  }

  togglePause() {
    if (this.resumePublication) {
      this.resumePublication();
      this.resumePublication = undefined;
      this.paused.set(false);
      this.result.set('Publication resumed; the next scroll updates the URL again.');
    } else {
      this.resumePublication = this.scroll().suspendPublication();
      this.paused.set(true);
      this.result.set('Publication paused; scrolling no longer changes the URL.');
    }
  }

  discard() {
    this.scroll().discardPendingPublication();
    this.result.set('Pending URL update discarded.');
  }

  /**
   * Simulates closing an overlay whose animation shifts the document before the application routes
   * to the target. Without protection, the scroll spy replaces the source history entry meanwhile.
   */
  async openContactViaOverlay() {
    this.flowRunning.set(true);
    const source = this.scroll().activeAnchor() ?? 'none';
    const resume = this.protectFlow() ? this.scroll().suspendPublication() : undefined;
    try {
      this.result.set(`Overlay closing… Back should return to ${source}.`);
      const viewport = this.window?.document.querySelector<HTMLElement>('.viewport');
      const shifted = viewport?.querySelector<HTMLElement>('#ziel-projekte');
      if (viewport && shifted) {
        viewport.scrollBy({
          top: shifted.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
          behavior: 'instant',
        });
      }
      await new Promise<void>((done) => setTimeout(done, OVERLAY_CLOSE_DELAY));
      await this.router.navigate([], {
        relativeTo: this.route,
        fragment: 'ziel-kontakt',
        queryParamsHandling: 'preserve',
      });
      this.result.set(`Navigated to ziel-kontakt. Press Back: expected ${source}.`);
    } finally {
      resume?.();
      this.flowRunning.set(false);
    }
  }

  private updateHistoryLength() {
    this.historyLength.set(this.window?.history.length ?? 0);
  }
}

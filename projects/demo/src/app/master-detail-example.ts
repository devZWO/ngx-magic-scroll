import { Component, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { delay, of } from 'rxjs';
import { MagicScrollDirective, provideMagicScroll } from '@devzwo/ngx-magic-scroll';

@Component({
  imports: [MagicScrollDirective],
  providers: [
    provideMagicScroll({
      anchorPrefix: 'projekt-',
      headerSelector: '.portfolio-header',
      headerOffset: 16,
      behavior: { interaction: 'instant' },
    }),
  ],
  template: ` <header class="portfolio-header" [class.expanded]="expanded()">
      <div>
        <strong>Portfolio · Master and details</strong
        ><button (click)="expanded.set(!expanded())">Change header height</button>
      </div>
      <p>
        Measured header height:
        <output data-testid="header-height">{{ scroll.headerHeight() }}</output> px · Active anchor:
        {{ scroll.activeAnchor() }}
      </p>
      @if (expanded()) {
        <p>Additional toolbar · The visible top edge adjusts automatically.</p>
      }
    </header>
    <h1>Master–Detail · Page scrolling</h1>
    <p>
      The index on the left scrolls independently. Details on the right expand to their full height
      and scroll the document. Inspired by the portfolio editor in zwoPRO.
    </p>
    <div class="portfolio-layout" [style.--header-offset]="scroll.offset() + 'px'">
      <aside class="portfolio-master" aria-label="Portfolio projects">
        <h2>Projects</h2>
        <nav aria-label="Project overview">
          @for (id of projects; track id) {
            <button
              [attr.aria-current]="scroll.activeAnchor() === 'projekt-' + id ? 'true' : null"
              (click)="jump(id)"
            >
              Project {{ id }}
            </button>
          }
        </nav>
      </aside>
      <div class="portfolio-details" magicScroll #scroll="magicScroll" [scrollSource]="resource">
        @if (resource.isLoading()) {
          <p role="status">Loading projects…</p>
        }
        @for (id of resource.value(); track id) {
          <section [id]="'projekt-' + id">
            <h2>Project {{ id }}</h2>
            <p>Portfolio details · Planning and implementation</p>
            <h3>Description</h3>
            <p>
              This section has no constrained scroll height. Its content increases the height of the
              entire page.
            </p>
            <h3>Milestones</h3>
            <p>Design, implementation and acceptance with a stable project ID as the anchor.</p>
          </section>
        }
      </div>
    </div>`,
  styles: `
    :host {
      display: block;
    }
    .portfolio-header {
      position: sticky;
      top: 0;
      z-index: 10;
      flex-direction: column;
      gap: 0;
      margin: -24px -24px 0;
      padding: 12px 24px;
    }
    .portfolio-header p {
      margin: 8px 0;
    }
    .portfolio-header div {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .portfolio-layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      align-items: start;
      gap: 24px;
    }
    .portfolio-master {
      position: sticky;
      top: var(--header-offset);
      max-height: calc(100dvh - var(--header-offset) - 16px);
      overflow-y: auto;
      background: white;
    }
    .portfolio-master h2 {
      padding: 0 16px;
    }
    .portfolio-master nav {
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
    }
    .portfolio-master button[aria-current='true'] {
      background: #203047;
      color: white;
    }
    .portfolio-details {
      min-width: 0;
      background: white;
    }
    .portfolio-details section {
      min-height: 440px;
    }
    @media (max-width: 700px) {
      .portfolio-layout {
        grid-template-columns: 140px minmax(0, 1fr);
        gap: 12px;
      }
    }
  `,
})
export class MasterDetailExample {
  readonly projects = Array.from({ length: 24 }, (_, i) => i + 1);
  readonly expanded = signal(false);
  readonly resource = rxResource({ stream: () => of(this.projects).pipe(delay(250)) });
  private readonly scroll = viewChild.required(MagicScrollDirective);
  jump(id: number) {
    this.scroll().scrollTo('projekt-' + id);
  }
}

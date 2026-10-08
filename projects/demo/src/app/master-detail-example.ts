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
        <strong>Portfolio · Master und Details</strong
        ><button (click)="expanded.set(!expanded())">Headerhöhe ändern</button>
      </div>
      <p>
        Gemessene Headerhöhe:
        <output data-testid="header-height">{{ scroll.headerHeight() }}</output> px · Aktiver Anker:
        {{ scroll.activeAnchor() }}
      </p>
      @if (expanded()) {
        <p>Zusätzliche Toolbar · Die sichtbare Oberkante passt sich automatisch an.</p>
      }
    </header>
    <h1>Master–Detail · Die Seite scrollt</h1>
    <p>
      Links scrollt das Inhaltsverzeichnis unabhängig. Rechts wachsen die Details in voller Länge
      und scrollen das Dokument. Inspiriert vom Portfolio-Editor in zwoPRO.
    </p>
    <div class="portfolio-layout" [style.--header-offset]="scroll.offset() + 'px'">
      <aside class="portfolio-master" aria-label="Portfolio-Projekte">
        <h2>Projekte</h2>
        <nav aria-label="Projektübersicht">
          @for (id of projects; track id) {
            <button
              [attr.aria-current]="scroll.activeAnchor() === 'projekt-' + id ? 'true' : null"
              (click)="jump(id)"
            >
              Projekt {{ id }}
            </button>
          }
        </nav>
      </aside>
      <div class="portfolio-details" magicScroll #scroll="magicScroll" [scrollSource]="resource">
        @if (resource.isLoading()) {
          <p role="status">Projekte laden…</p>
        }
        @for (id of resource.value(); track id) {
          <section [id]="'projekt-' + id">
            <h2>Projekt {{ id }}</h2>
            <p>Portfolio-Details · Planung und Umsetzung</p>
            <h3>Beschreibung</h3>
            <p>
              Dieser Abschnitt hat keine begrenzte Scrollhöhe. Sein Inhalt vergrößert die gesamte
              Seite.
            </p>
            <h3>Meilensteine</h3>
            <p>Konzeption, Umsetzung und Abnahme mit einer stabilen Projekt-ID als Anker.</p>
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

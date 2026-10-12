import {
  Component,
  DestroyRef,
  DOCUMENT,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-active-zone-overlay',
  host: {
    class: 'active-zone-overlay',
    'aria-hidden': 'true',
    '[style.top.px]': 'top()',
    '[style.left.px]': 'left()',
    '[style.width.px]': 'width()',
    '[style.height.px]': 'height()',
  },
  template: `
    @if (topBoundary() > 0) {
      <div
        class="active-zone-top-exclusion"
        [style.height.px]="topBoundary()"
        data-testid="top-exclusion-zone"
      >
        <span class="active-zone-badge active-zone-badge-exclusion">
          Top Exclusion ({{ topBoundary() }}px)
        </span>
      </div>
    }
    <div
      class="active-zone-reading-area"
      [style.top.px]="topBoundary()"
      [style.height.px]="readingHeight()"
      data-testid="reading-area-zone"
    >
      <span class="active-zone-badge active-zone-badge-reading">
        Active Reading Area ({{ readingHeight() }}px)
      </span>
    </div>
    @if (effectiveBottomOffset() > 0) {
      <div
        class="active-zone-bottom-exclusion"
        [style.height.px]="effectiveBottomOffset()"
        [style.top.px]="bottomBoundary()"
        data-testid="bottom-exclusion-zone"
      >
        <span class="active-zone-badge active-zone-badge-exclusion">
          Bottom Exclusion ({{ effectiveBottomOffset() }}px)
        </span>
      </div>
    }
    <div class="active-zone-trigger-line" [style.top.px]="triggerLine()" data-testid="trigger-line">
      <span class="active-zone-trigger-badge" data-testid="trigger-line-badge">
        Trigger Line ({{ thresholdPercentage() }}%)
      </span>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      pointer-events: none;
      z-index: 20;
      box-sizing: border-box;
      overflow: hidden;
    }
    .active-zone-top-exclusion {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(239, 68, 68, 0.12);
      border-bottom: 2px dashed rgba(220, 38, 38, 0.6);
      box-sizing: border-box;
      display: flex;
      align-items: flex-start;
      padding: 6px 12px;
    }
    .active-zone-reading-area {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(37, 99, 235, 0.08);
      border-left: 3px solid rgba(37, 99, 235, 0.4);
      border-right: 3px solid rgba(37, 99, 235, 0.4);
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 6px 12px;
    }
    .active-zone-bottom-exclusion {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(239, 68, 68, 0.12);
      border-top: 2px dashed rgba(220, 38, 38, 0.6);
      box-sizing: border-box;
      display: flex;
      align-items: flex-end;
      padding: 6px 12px;
    }
    .active-zone-trigger-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #b91c1c;
      box-shadow: 0 0 6px rgba(185, 28, 28, 0.4);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 16px;
    }
    .active-zone-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      user-select: none;
    }
    .active-zone-badge-exclusion {
      background: #7f1d1d;
      color: #ffffff;
    }
    .active-zone-badge-reading {
      background: #1e3a8a;
      color: #ffffff;
    }
    .active-zone-trigger-badge {
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 700;
      background: #991b1b;
      color: #ffffff;
      padding: 3px 10px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
      user-select: none;
    }
  `,
})
export class ActiveZoneOverlay {
  readonly target = input<HTMLElement | 'window' | null | undefined>('window');
  readonly headerSelector = input<string>('');
  readonly headerOffset = input<number>(0);
  readonly bottomOffset = input<number>(0);
  readonly activationThreshold = input<number>(0);

  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly viewportRect = signal<{
    top: number;
    left: number;
    width: number;
    height: number;
    headerHeight: number;
  }>({
    top: 0,
    left: 0,
    width: this.document.defaultView?.innerWidth ?? 0,
    height: this.document.defaultView?.innerHeight ?? 0,
    headerHeight: 0,
  });

  readonly top = computed(() => this.viewportRect().top);
  readonly left = computed(() => this.viewportRect().left);
  readonly width = computed(() => this.viewportRect().width);
  readonly height = computed(() => this.viewportRect().height);

  readonly measuredHeaderHeight = computed(() => this.viewportRect().headerHeight);

  readonly topBoundary = computed(() => {
    return this.headerOffset() + this.measuredHeaderHeight();
  });

  readonly effectiveBottomOffset = computed(() => {
    return Math.max(0, Math.min(this.height() - this.topBoundary(), this.bottomOffset()));
  });

  readonly bottomBoundary = computed(() => {
    return Math.max(this.topBoundary(), this.height() - this.effectiveBottomOffset());
  });

  readonly readingHeight = computed(() => {
    return Math.max(0, this.bottomBoundary() - this.topBoundary());
  });

  readonly triggerLine = computed(() => {
    const topB = this.topBoundary();
    const bottomB = this.bottomBoundary();
    const threshold = Math.max(0, Math.min(1, this.activationThreshold()));
    return topB + (bottomB - topB) * threshold;
  });

  readonly thresholdPercentage = computed(() => {
    return Math.round(Math.max(0, Math.min(1, this.activationThreshold())) * 100);
  });

  constructor() {
    effect(() => {
      this.target();
      this.headerSelector();
      this.headerOffset();
      this.bottomOffset();
      this.activationThreshold();
      this.updateGeometry();
    });

    afterNextRender(() => {
      this.updateGeometry();

      const onUpdate = () => {
        this.updateGeometry();
      };

      const win = this.document.defaultView;
      win?.addEventListener('scroll', onUpdate, { passive: true, capture: true });
      win?.addEventListener('resize', onUpdate, { passive: true });

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          this.zone.run(() => this.updateGeometry());
        });
        const tgt = this.target();
        if (tgt && tgt !== 'window' && tgt instanceof HTMLElement) {
          ro.observe(tgt);
        }
        const hSelector = this.headerSelector();
        if (hSelector) {
          const headerEl = this.document.querySelector<HTMLElement>(hSelector);
          if (headerEl) ro.observe(headerEl);
        }
      }

      this.destroyRef.onDestroy(() => {
        win?.removeEventListener('scroll', onUpdate, { capture: true });
        win?.removeEventListener('resize', onUpdate);
        ro?.disconnect();
      });
    });
  }

  updateGeometry(): void {
    const win = this.document.defaultView;
    if (!win) return;

    const doc = this.document;
    const tgt = this.target();
    let top = 0;
    let left = 0;
    let width = win.innerWidth;
    let height = win.innerHeight;

    if (tgt && tgt !== 'window' && tgt instanceof HTMLElement) {
      const rect = tgt.getBoundingClientRect();
      top = rect.top;
      left = rect.left;
      width = rect.width;
      height = rect.height;
    }

    let headerHeight = 0;
    const hSelector = this.headerSelector();
    if (hSelector) {
      const headerEl = doc.querySelector<HTMLElement>(hSelector);
      if (headerEl) {
        headerHeight = headerEl.getBoundingClientRect().height;
      }
    }

    this.viewportRect.set({ top, left, width, height, headerHeight });
  }
}

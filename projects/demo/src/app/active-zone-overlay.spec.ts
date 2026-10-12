import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveZoneOverlay } from './active-zone-overlay';
import { Component, DOCUMENT, signal } from '@angular/core';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(readonly callback: (entries?: unknown[]) => void) {
    MockResizeObserver.instances.push(this);
  }
}

@Component({
  imports: [ActiveZoneOverlay],
  template: `
    <app-active-zone-overlay
      [target]="target()"
      [headerOffset]="offset()"
      [bottomOffset]="bottomOffset()"
      [activationThreshold]="activationThreshold()"
      [headerSelector]="headerSelector()"
    />
  `,
})
class TestHost {
  readonly target = signal<HTMLElement | 'window' | null | undefined>('window');
  readonly offset = signal(0);
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly headerSelector = signal('');
}

describe('ActiveZoneOverlay', () => {
  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    MockResizeObserver.instances = [];

    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function createComponent(): { fixture: ComponentFixture<TestHost>; host: TestHost } {
    const fixture = TestBed.createComponent(TestHost);
    const host = fixture.componentInstance;
    return { fixture, host };
  }

  it('renders trigger line and computes thresholds correctly', () => {
    const { fixture, host } = createComponent();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const triggerBadge = compiled.querySelector('[data-testid="trigger-line-badge"]');
    expect(triggerBadge?.textContent).toContain('Trigger Line (0%)');

    host.activationThreshold.set(0.5);
    fixture.detectChanges();
    expect(triggerBadge?.textContent).toContain('Trigger Line (50%)');
  });

  it('clamps activationThreshold between 0 and 1', () => {
    const { fixture, host } = createComponent();
    fixture.detectChanges();

    host.activationThreshold.set(-0.2);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    let triggerBadge = compiled.querySelector('[data-testid="trigger-line-badge"]');
    expect(triggerBadge?.textContent).toContain('Trigger Line (0%)');

    host.activationThreshold.set(1.5);
    fixture.detectChanges();
    triggerBadge = compiled.querySelector('[data-testid="trigger-line-badge"]');
    expect(triggerBadge?.textContent).toContain('Trigger Line (100%)');
  });

  it('renders top and bottom exclusion zones when offsets are set', () => {
    const { fixture, host } = createComponent();
    host.offset.set(40);
    host.bottomOffset.set(60);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const topZone = compiled.querySelector('[data-testid="top-exclusion-zone"]');
    const bottomZone = compiled.querySelector('[data-testid="bottom-exclusion-zone"]');

    expect(topZone).not.toBeNull();
    expect(bottomZone).not.toBeNull();
    expect(topZone?.textContent).toContain('Top Exclusion (40px)');
    expect(bottomZone?.textContent).toContain('Bottom Exclusion (60px)');
  });

  it('updates geometry and observes element when target is an HTMLElement', () => {
    const targetEl = document.createElement('div');
    targetEl.getBoundingClientRect = () =>
      ({
        top: 50,
        left: 20,
        width: 600,
        height: 800,
        bottom: 850,
        right: 620,
        x: 20,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect;

    const { fixture, host } = createComponent();
    host.target.set(targetEl);
    fixture.detectChanges();

    const overlayEl = fixture.nativeElement.querySelector('.active-zone-overlay') as HTMLElement;
    expect(overlayEl.style.top).toBe('50px');
    expect(overlayEl.style.left).toBe('20px');
    expect(overlayEl.style.width).toBe('600px');
    expect(overlayEl.style.height).toBe('800px');

    const lastObserver = MockResizeObserver.instances.at(-1);
    expect(lastObserver?.observe).toHaveBeenCalledWith(targetEl);
  });

  it('measures header height and observes header when headerSelector is provided and element exists', () => {
    const headerEl = document.createElement('header');
    headerEl.id = 'demo-header';
    headerEl.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        width: 800,
        height: 75,
        bottom: 75,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(headerEl);

    try {
      const { fixture, host } = createComponent();
      host.offset.set(10);
      host.headerSelector.set('#demo-header');
      fixture.detectChanges();

      const topZone = fixture.nativeElement.querySelector(
        '[data-testid="top-exclusion-zone"]',
      ) as HTMLElement;
      expect(topZone).not.toBeNull();
      // topBoundary = headerOffset (10) + measuredHeaderHeight (75) = 85
      expect(topZone.textContent).toContain('Top Exclusion (85px)');

      const lastObserver = MockResizeObserver.instances.at(-1);
      expect(lastObserver?.observe).toHaveBeenCalledWith(headerEl);
    } finally {
      document.body.removeChild(headerEl);
    }
  });

  it('handles non-existent headerSelector gracefully', () => {
    const { fixture, host } = createComponent();
    host.offset.set(25);
    host.headerSelector.set('#non-existent-header');
    fixture.detectChanges();

    const topZone = fixture.nativeElement.querySelector(
      '[data-testid="top-exclusion-zone"]',
    ) as HTMLElement;
    expect(topZone).not.toBeNull();
    // measuredHeaderHeight = 0, topBoundary = 25
    expect(topZone.textContent).toContain('Top Exclusion (25px)');
  });

  it('updates geometry on window scroll and resize events', () => {
    const { fixture } = createComponent();
    fixture.detectChanges();

    const overlayInstance = fixture.debugElement.children[0].componentInstance as ActiveZoneOverlay;
    const updateGeometrySpy = vi.spyOn(overlayInstance, 'updateGeometry');

    window.dispatchEvent(new Event('scroll'));
    expect(updateGeometrySpy).toHaveBeenCalled();

    updateGeometrySpy.mockClear();
    window.dispatchEvent(new Event('resize'));
    expect(updateGeometrySpy).toHaveBeenCalled();
  });

  it('updates geometry when ResizeObserver triggers its callback', () => {
    const { fixture } = createComponent();
    fixture.detectChanges();

    const overlayInstance = fixture.debugElement.children[0].componentInstance as ActiveZoneOverlay;
    const updateGeometrySpy = vi.spyOn(overlayInstance, 'updateGeometry');

    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeDefined();

    observer.callback();
    expect(updateGeometrySpy).toHaveBeenCalled();
  });

  it('disconnects ResizeObserver and removes window event listeners on destroy', () => {
    const { fixture } = createComponent();
    fixture.detectChanges();

    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeDefined();

    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
      capture: true,
    });
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('handles null, undefined, or window target gracefully', () => {
    const { fixture, host } = createComponent();
    host.target.set(null);
    fixture.detectChanges();

    const overlayEl = fixture.nativeElement.querySelector('.active-zone-overlay') as HTMLElement;
    expect(overlayEl.style.top).toBe('0px');
    expect(overlayEl.style.left).toBe('0px');

    host.target.set(undefined);
    fixture.detectChanges();
    expect(overlayEl.style.top).toBe('0px');

    host.target.set('window');
    fixture.detectChanges();
    expect(overlayEl.style.top).toBe('0px');
  });

  it('handles environment where ResizeObserver is undefined', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const { fixture } = createComponent();
    expect(() => fixture.detectChanges()).not.toThrow();

    const overlayEl = fixture.nativeElement.querySelector('.active-zone-overlay') as HTMLElement;
    expect(overlayEl).not.toBeNull();
  });

  it('handles environment without defaultView (SSR) gracefully', () => {
    const doc = TestBed.inject(DOCUMENT);
    const spy = vi.spyOn(doc, 'defaultView', 'get').mockReturnValue(null);

    const { fixture } = createComponent();
    expect(() => fixture.detectChanges()).not.toThrow();

    const overlayInstance = fixture.debugElement.children[0].componentInstance as ActiveZoneOverlay;
    expect(() => overlayInstance.updateGeometry()).not.toThrow();

    spy.mockRestore();
  });
});

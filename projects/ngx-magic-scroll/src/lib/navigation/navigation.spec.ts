import { Component, ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ScrollService } from './scroll-service';
import { NearestAnchorProvider } from './nearest-anchor.provider';
import { injectedHeaderHeight } from './inject-header-size';
import { injectScrollableParentElement } from './inject-scrollable-parent';
import { linkedRouteFragment } from './linked-route-fragment';
import { NearestAnchorScrollHook } from './nearest-anchor-scroll-hook';
import { PreserveVisibleAnchorOnResize } from './preserve-visible-anchor-on-resize.directive';
import { ScrollToFragmentOnFirstDataDirective } from './scroll-to-fragment-on-first-data.directive';
import { ScrollToFragmentOnDataChangeDirective } from './scroll-to-fragment-on-data-change.directive';

const rect = (top: number, bottom = top + 30) => ({
  top,
  bottom,
  height: bottom - top,
  left: 0,
  right: 100,
  width: 100,
  x: 0,
  y: top,
  toJSON() {
    return {};
  },
});

function element(id: string, top: number, bottom?: number) {
  const el = document.createElement('div');
  el.id = id;
  el.getBoundingClientRect = () => rect(top, bottom);
  document.body.append(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ScrollService', () => {
  it('handles missing targets and applies offsets in a single instant or smooth document scroll', () => {
    const service = TestBed.inject(ScrollService);
    expect(service.scroll('missing')).toBe(false);
    element('target', 200);
    document.documentElement.scrollTo = vi.fn();
    expect(service.scroll('#target')).toBe(true);
    expect(document.documentElement.scrollTo).toHaveBeenCalledWith({
      top: 180,
      behavior: 'instant',
    });
    service.scroll('target', { behavior: 'smooth', topOffset: 8 });
    expect(document.documentElement.scrollTo).toHaveBeenLastCalledWith({
      top: 192,
      behavior: 'smooth',
    });
  });
  it.each([
    ['none', 120, 180, true],
    ['top', 120, 180, false],
    ['top', 109.5, 180, false],
    ['top', 80, 180, true],
    ['top', 700, 730, true],
    ['full', 120, 180, false],
    ['full', 120, 700, true],
    ['full', 80, 180, true],
    ['always', 80, 180, false],
    ['always', 120, 700, false],
    ['always', 80, 700, true],
    ['always', 20, 80, true],
  ] as const)('visibility %s (%i,%i)', (mode, top, bottom, expected) => {
    const container = element('container', 100, 600);
    Object.defineProperty(container, 'clientHeight', { value: 500 });
    container.scrollTo = vi.fn();
    const el = element('target', top, bottom);
    el.scrollIntoView = vi.fn();
    expect(
      TestBed.inject(ScrollService).scroll('target', {
        scrollable: container,
        ignoreWhenInView: mode,
        topOffset: 10,
      }),
    ).toBe(expected);
  });
});
it('measures header height and handles absent headers', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(injectedHeaderHeight('.missing', document)).toBe(0);
  element('header', 10, 70);
  expect(injectedHeaderHeight('#header', document)).toBe(60);
});
it('finds the nearest auto or scroll ancestor, including injection and missing parents', () => {
  const outer = element('outer', 0);
  outer.style.overflowY = 'auto';
  const middle = document.createElement('div');
  const child = document.createElement('div');
  outer.append(middle);
  middle.append(child);
  expect(injectScrollableParentElement(child)).toBe(outer);
  middle.style.overflowY = 'scroll';
  expect(injectScrollableParentElement(child)).toBe(middle);
  TestBed.configureTestingModule({
    providers: [{ provide: ElementRef, useValue: new ElementRef(child) }],
  });
  expect(TestBed.runInInjectionContext(() => injectScrollableParentElement())).toBe(middle);
  expect(injectScrollableParentElement(outer)).toBeUndefined();
  expect(injectScrollableParentElement(document.createElement('div'))).toBeUndefined();
});
it('selects visible anchors with defaults, prefixes, header offsets and container coordinates', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);
  expect(provider.getNearestAnchor()).toBeUndefined();
  const a = element('a', 80, 110),
    b = element('b', 40, 70),
    c = element('c', -10, 20);
  // Under hybrid model, b and a are fully contained in [0, 768]; topmost is b
  expect(provider.getNearestAnchor()).toBe('b');
  element('far', 200, 230);
  expect(provider.getNearestAnchor()).toBe('b');
  // With headerOffset: 60, topBoundary is 60. b (40..70) is obscured/not fully contained. a (80..110) is fully contained.
  expect(provider.getNearestAnchor({ headerOffset: 60 })).toBe('a');
  element('header', 0, 50);
  // With header 50px, boundary is 50. a (80..110) is fully contained and selected.
  expect(
    provider.getNearestAnchor({ selector: '[id="a"], [id="b"]', headerSelector: '#header' }),
  ).toBe('a');
  const container = element('container', 100, 400);
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);
  host.append(a, b, c);
  // In container [100, 400]: a (80..110), b (40..70), c (-10..20) are none fully contained. Reading line picks a (top 80 <= 100).
  expect(provider.getNearestAnchor({ hostElement: host })).toBe('a');
  // Move a to 110..140: a is now fully contained in container [100, 400].
  a.getBoundingClientRect = () => rect(110, 140);
  expect(provider.getNearestAnchor({ hostElement: host })).toBe('a');
});

it('prioritizes fully contained sections over partially visible preceding sections (full containment elevation)', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // sec1 is partially scrolled past top (tail is visible [0..100])
  // sec2 is 100% visible inside viewport [0..768] (top 120, bottom 320)
  element('sec-1', -300, 100);
  element('sec-2', 120, 320);

  expect(provider.getNearestAnchor()).toBe('sec-2');
});

it('selects the topmost fully contained section when multiple sections are completely visible', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  element('sec-1', -200, 50); // partially above
  element('sec-2', 80, 200); // fully contained
  element('sec-3', 250, 400); // fully contained
  element('sec-4', 450, 600); // fully contained

  // Among sec-2, sec-3, sec-4 (all fully contained), sec-2 has smallest top
  expect(provider.getNearestAnchor()).toBe('sec-2');
});

it('falls back to reading-line position when no section is fully contained (tall sections exceeding viewport)', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // Both sections are taller than viewport (height 1400 > 768)
  element('sec-1', -400, 1000);
  element('sec-2', 1000, 2400);

  // sec1 crosses reading line (top -400 <= 0 + 1) and neither is fully contained
  expect(provider.getNearestAnchor()).toBe('sec-1');
});

it('selects the first anchor when no anchor has crossed the boundary yet and none is fully contained', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // Viewport is [0, 768], topBoundary is 0, bottomBoundary is 768.
  // Both anchors start below triggerLine (top > 1) and extend beyond bottomBoundary (bottom > 769), so neither is fully contained or passed.
  // We place sec-2 before sec-1 and sec-3 after to exercise both branches of reduce.
  element('sec-2', 300, 1200);
  element('sec-1', 100, 1000);
  element('sec-3', 500, 1400);

  expect(provider.getNearestAnchor()).toBe('sec-1');
});

it('falls back to documentElement clientHeight when defaultView is null', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  element('sec-1', 0, 100);
  const spy = vi.spyOn(document, 'defaultView', 'get').mockReturnValue(null);
  expect(provider.getNearestAnchor()).toBe('sec-1');
  spy.mockRestore();
});

it('respects sticky headers and offsets when evaluating full containment', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  element('header', 0, 80); // 80px sticky header
  element('sec-1', 40, 140); // top 40 is behind header (< 80 + 20 offset)
  element('sec-2', 110, 250); // top 110, bottom 250 -> fully contained below header

  expect(
    provider.getNearestAnchor({
      headerSelector: '#header',
      headerOffset: 20,
    }),
  ).toBe('sec-2');
});

it('evaluates full containment within scrollable container boundaries', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  const container = element('container', 100, 500);
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);

  const sec1 = element('sec-1', 50, 180); // top 50 < container top 100 (partially above)
  const sec2 = element('sec-2', 150, 300); // fully contained in [100, 500]
  host.append(sec1, sec2);

  expect(provider.getNearestAnchor({ hostElement: host })).toBe('sec-2');
});

it('adjusts the bottom boundary when bottomOffset is specified', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // Document viewport is [0, 768]
  element('sec-1', -100, 200); // top -100 (partially above)
  element('sec-2', 600, 750); // top 600, bottom 750 (inside [0, 768])

  // Without bottomOffset, sec-2 is fully contained in [0, 768] and wins
  expect(provider.getNearestAnchor()).toBe('sec-2');

  // With bottomOffset: 100, bottomBoundary becomes 768 - 100 = 668.
  // sec-2 (bottom 750) is no longer fully contained in [0, 668], so sec-1 (reading line top <= 0) wins
  expect(provider.getNearestAnchor({ bottomOffset: 100 })).toBe('sec-1');
});

it('applies bottomOffset within scrollable containers', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  const container = element('container', 100, 500);
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);

  const sec1 = element('sec-1', 50, 200);
  const sec2 = element('sec-2', 380, 480);
  host.append(sec1, sec2);

  // In container [100, 500]: sec-2 is fully contained
  expect(provider.getNearestAnchor({ hostElement: host })).toBe('sec-2');

  // With bottomOffset: 50, container bottomBoundary is 500 - 50 = 450.
  // sec-2 (bottom 480 > 450) is excluded from full containment, falling back to sec-1
  expect(provider.getNearestAnchor({ hostElement: host, bottomOffset: 50 })).toBe('sec-1');
});

it('clamps negative bottomOffset so off-screen anchors below viewport are not treated as contained', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // Document viewport is [0, 768]
  element('sec-1', -100, 200); // partially visible, crossed triggerLine (0)
  element('sec-2', 800, 850); // completely below viewport

  // Negative bottomOffset should be clamped to 0, keeping bottomBoundary at 768.
  // sec-2 (bottom 850 > 768) must not be treated as fully contained.
  expect(provider.getNearestAnchor({ bottomOffset: -100 })).toBe('sec-1');
});

it('clamps bottomOffset when offset exceeds available height so bottomBoundary does not fall below topBoundary', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  const container = element('container', 100, 500); // top 100, bottom 500 (height 400)
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);

  const sec1 = element('sec-1', 50, 300);
  const sec2 = element('sec-2', 140, 600);
  host.append(sec1, sec2);

  // topBoundary = 100 + 50 (headerOffset) = 150
  // bottomOffset = 600 (exceeds container height 400).
  // Clamped bottomBoundary = max(150, 500 - 600) = 150.
  // triggerLine = 150 + (150 - 150) * 0.5 = 150.
  // sec-2 top 140 <= 150, so sec-2 crossed the trigger line and wins.
  expect(
    provider.getNearestAnchor({
      hostElement: host,
      headerOffset: 50,
      bottomOffset: 600,
      activationThreshold: 0.5,
    }),
  ).toBe('sec-2');
});

it('applies activationThreshold to shift the trigger line relative to the reading area', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  // Document viewport is [0, 768]
  const sec1 = element('section-1', -200, 800);
  const sec2 = element('section-2', 400, 1400);

  // With default threshold (0), trigger line is 0. sec2 top 400 > 0, so sec1 wins
  expect(provider.getNearestAnchor()).toBe('section-1');

  // With activationThreshold: 0.5, triggerLine = 0 + (768 - 0) * 0.5 = 384.
  // sec2 top 400 > 384 -> sec1 is still active
  expect(provider.getNearestAnchor({ activationThreshold: 0.5 })).toBe('section-1');

  // When sec2 scrolls up to top 350 (<= 384): sec2 crosses the 50% trigger line and becomes active
  sec1.getBoundingClientRect = () => rect(-250, 750);
  sec2.getBoundingClientRect = () => rect(350, 1350);
  expect(provider.getNearestAnchor({ activationThreshold: 0.5 })).toBe('section-2');
});

it('applies activationThreshold combined with container bounds, header offset, and bottom offset', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);

  const container = element('container', 100, 600); // top 100, bottom 600
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);

  const sec1 = element('sec-1', 50, 1000);
  const sec2 = element('sec-2', 300, 1500);
  host.append(sec1, sec2);

  // topBoundary = 100 + 20 (headerOffset) = 120
  // bottomBoundary = 600 - 80 (bottomOffset) = 520
  // visible reading area = 520 - 120 = 400
  // triggerLine = 120 + 400 * 0.25 = 220
  // sec2 top 300 > 220 -> sec1 active
  expect(
    provider.getNearestAnchor({
      hostElement: host,
      headerOffset: 20,
      bottomOffset: 80,
      activationThreshold: 0.25,
    }),
  ).toBe('sec-1');

  // Scroll sec2 to top 200 (<= 220) -> sec2 becomes active
  sec2.getBoundingClientRect = () => rect(200, 1400);
  expect(
    provider.getNearestAnchor({
      hostElement: host,
      headerOffset: 20,
      bottomOffset: 80,
      activationThreshold: 0.25,
    }),
  ).toBe('sec-2');
});

it('keeps the active section while scrolling through a long section until the next section crosses the activation boundary', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const provider = TestBed.inject(NearestAnchorProvider);
  const sec1 = element('section-1', 0, 1000),
    sec2 = element('section-2', 1000, 2000),
    sec3 = element('section-3', 2000, 3000);

  // At top: section-1 is active
  expect(provider.getNearestAnchor()).toBe('section-1');

  // Scrolled 400px down: section-1 heading is above top (-400), section-2 is at +600 (not crossed yet)
  sec1.getBoundingClientRect = () => rect(-400, 600);
  sec2.getBoundingClientRect = () => rect(600, 1600);
  sec3.getBoundingClientRect = () => rect(1600, 2600);
  expect(provider.getNearestAnchor()).toBe('section-1');

  // Scrolled further: section-2 reaches boundary (0)
  sec1.getBoundingClientRect = () => rect(-1000, 0);
  sec2.getBoundingClientRect = () => rect(0, 1000);
  sec3.getBoundingClientRect = () => rect(1000, 2000);
  expect(provider.getNearestAnchor()).toBe('section-2');

  // Scrolled into section-2: section-2 heading is at -300, section-3 is at +700
  sec1.getBoundingClientRect = () => rect(-1300, -300);
  sec2.getBoundingClientRect = () => rect(-300, 700);
  sec3.getBoundingClientRect = () => rect(700, 1700);
  expect(provider.getNearestAnchor()).toBe('section-2');

  // Scrolling backwards up: section-2 heading goes back below top (+100)
  sec1.getBoundingClientRect = () => rect(-900, 100);
  sec2.getBoundingClientRect = () => rect(100, 1100);
  sec3.getBoundingClientRect = () => rect(1100, 2100);
  expect(provider.getNearestAnchor()).toBe('section-1');
});

describe('route fragment', () => {
  it('reads external changes, preserves parameters, tags internal navigation, clears fragments and handles failed navigation', async () => {
    const fragment = new BehaviorSubject<string | null>('a');
    const snapshot = { fragment: 'a' };
    const router = {
      createUrlTree: vi.fn(() => 'tree'),
      navigateByUrl: vi.fn(() => Promise.resolve(true)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { fragment, snapshot } },
        { provide: Router, useValue: router },
      ],
    });
    const value = TestBed.runInInjectionContext(linkedRouteFragment);
    TestBed.tick();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    value.set('b');
    TestBed.tick();
    expect(router.createUrlTree).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      fragment: 'b',
      queryParamsHandling: 'preserve',
    });
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('tree', {
      replaceUrl: true,
      state: { __ngx_magic_scroll_origin: 'scroll-spy' },
      info: { __ngx_magic_scroll_origin: 'scroll-spy' },
    });
    snapshot.fragment = 'c';
    fragment.next('c');
    TestBed.tick();
    expect(value()).toBe('c');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    router.navigateByUrl.mockRejectedValueOnce(new Error('failed'));
    value.set(null);
    TestBed.tick();
    await Promise.resolve();
    expect(router.createUrlTree).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      fragment: undefined,
      queryParamsHandling: 'preserve',
    });
    expect(console.log).toHaveBeenCalled();
  });

  it('preserves existing developer history state when updating fragment', () => {
    const fragment = new BehaviorSubject<string | null>('a');
    const snapshot = { fragment: 'a' };
    const router = {
      createUrlTree: vi.fn(() => 'tree'),
      navigateByUrl: vi.fn(() => Promise.resolve(true)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { fragment, snapshot } },
        { provide: Router, useValue: router },
      ],
    });
    window.history.replaceState({ developerData: 'custom-state', keepMe: 123 }, '');
    try {
      const value = TestBed.runInInjectionContext(linkedRouteFragment);
      TestBed.tick();
      value.set('b');
      TestBed.tick();
      expect(router.navigateByUrl).toHaveBeenLastCalledWith('tree', {
        replaceUrl: true,
        state: {
          developerData: 'custom-state',
          keepMe: 123,
          __ngx_magic_scroll_origin: 'scroll-spy',
        },
        info: { __ngx_magic_scroll_origin: 'scroll-spy' },
      });
    } finally {
      window.history.replaceState(null, '');
    }
  });
});

@Component({
  imports: [
    NearestAnchorScrollHook,
    PreserveVisibleAnchorOnResize,
    ScrollToFragmentOnFirstDataDirective,
    ScrollToFragmentOnDataChangeDirective,
  ],
  template: ` <div style="overflow-y:auto">
    <div
      appNearestAnchorScrollHook
      [selectorPrefix]="prefix()"
      [debounceTime]="debounce()"
      [preserveSelectorPrefix]="resizePrefix()"
      (appNearestAnchorScrollHook)="anchor = $event"
      appPreserveVisibleAnchorOnResize
      [appScrollingOnFirstData]="source"
      [appScrollingOnDataChange]="source"
    >
      <div id="item-1"></div>
    </div>
  </div>`,
})
class Host {
  prefix = signal('item-');
  debounce = signal(500);
  resizePrefix = signal('');
  anchor = '';
  data = signal<unknown>(undefined);
  loading = signal(true);
  source = { data: this.data, isLoading: this.loading };
}

describe('directives', () => {
  function setup(fragment: string | null = 'item-1') {
    const routeFragment = new BehaviorSubject(fragment);
    const scroll = { scroll: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        NearestAnchorProvider,
        { provide: ScrollService, useValue: scroll },
        { provide: ActivatedRoute, useValue: { fragment: routeFragment, snapshot: { fragment } } },
        {
          provide: Router,
          useValue: { createUrlTree: vi.fn(), navigateByUrl: vi.fn(() => Promise.resolve(true)) },
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, scroll, routeFragment };
  }

  it('waits for loaded data, scrolls initially once, restores on changes, emits anchors and resizes', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fixture, scroll, routeFragment } = setup();
    const host = fixture.componentInstance;
    host.data.set([1]);
    fixture.detectChanges();
    expect(scroll.scroll).not.toHaveBeenCalled();
    host.loading.set(false);
    fixture.detectChanges();
    vi.runOnlyPendingTimers();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);
    host.data.set([1, 2]);
    fixture.detectChanges();
    vi.runOnlyPendingTimers();
    expect(scroll.scroll).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event('resize'));
    expect(scroll.scroll).toHaveBeenCalledTimes(3);
    const container = fixture.nativeElement.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    vi.spyOn(TestBed.inject(NearestAnchorProvider), 'getNearestAnchor').mockReturnValueOnce(
      undefined,
    );
    host.prefix.set('missing-');
    fixture.detectChanges();
    TestBed.tick();
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    host.prefix.set('');
    fixture.detectChanges();
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();
    host.data.set([8]);
    fixture.detectChanges();
    routeFragment.next(null);
    vi.runOnlyPendingTimers();
    expect(scroll.scroll).toHaveBeenLastCalledWith('', expect.anything());
    fixture.detectChanges();
    window.dispatchEvent(new Event('resize'));
    host.data.set([3]);
    fixture.detectChanges();
    vi.runOnlyPendingTimers();
    const calls = scroll.scroll.mock.calls.length;
    fixture.destroy();
    container.dispatchEvent(new Event('scroll'));
    vi.runOnlyPendingTimers();
    expect(scroll.scroll).toHaveBeenCalledTimes(calls);
  });
  it('respects bound debounce times and later updates, and filters resize restoration by prefix', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fixture, scroll } = setup();
    const host = fixture.componentInstance;
    const provider = vi
      .spyOn(TestBed.inject(NearestAnchorProvider), 'getNearestAnchor')
      .mockReturnValue('item-1');
    host.debounce.set(25);
    host.resizePrefix.set('other-');
    fixture.detectChanges();
    TestBed.tick();
    window.dispatchEvent(new Event('resize'));
    expect(scroll.scroll).not.toHaveBeenCalled();
    host.resizePrefix.set('item-');
    fixture.detectChanges();
    window.dispatchEvent(new Event('resize'));
    expect(scroll.scroll).toHaveBeenCalledOnce();
    const container = fixture.nativeElement.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(24);
    fixture.detectChanges();
    expect(host.anchor).toBe('');
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    host.debounce.set(400);
    fixture.detectChanges();
    TestBed.tick();
    provider.mockReturnValue('item-2');
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(399);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-2');
    fixture.destroy();
  });
  it('restarts the debounce on each scroll and cancels pending work when destroyed', async () => {
    vi.useFakeTimers();
    const { fixture } = setup();
    const host = fixture.componentInstance;
    host.debounce.set(100);
    fixture.detectChanges();
    const provider = vi
      .spyOn(TestBed.inject(NearestAnchorProvider), 'getNearestAnchor')
      .mockReturnValue('item-1');
    const container = fixture.nativeElement.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(75);
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(99);
    fixture.detectChanges();
    expect(host.anchor).toBe('');
    expect(provider).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    expect(provider).toHaveBeenCalledOnce();

    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    fixture.destroy();
    container.dispatchEvent(new Event('scroll'));
    await vi.runAllTimersAsync();
    expect(provider).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('handles an absent initial fragment and absent scroll parents', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listen = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    TestBed.overrideComponent(Host, {
      set: {
        template: `<div appNearestAnchorScrollHook [appScrollingOnFirstData]="source" [appScrollingOnDataChange]="source"></div>`,
      },
    });
    const { fixture, scroll } = setup(null);
    fixture.componentInstance.data.set([]);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(scroll.scroll).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith('scroll', expect.any(Function));
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});

it('handles root viewport visibility and documents using body as scrolling element', () => {
  const target = element('root-target', 100, 160);
  target.scrollIntoView = vi.fn();
  document.body.scrollTo = vi.fn();
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(500);
  const original = Object.getOwnPropertyDescriptor(document, 'scrollingElement');
  Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.body });
  const service = TestBed.inject(ScrollService);
  expect(service.scroll('root-target', { ignoreWhenInView: 'full' })).toBe(false);
  expect(service.scroll('root-target', { scrollable: document.body })).toBe(true);
  expect(document.body.scrollTo).toHaveBeenCalledWith({ top: 80, behavior: 'instant' });
  if (original) Object.defineProperty(document, 'scrollingElement', original);
  else Reflect.deleteProperty(document, 'scrollingElement');
});
it('can destroy a scroll hook before its view has initialized', () => {
  TestBed.configureTestingModule({
    providers: [
      NearestAnchorProvider,
      { provide: ElementRef, useValue: new ElementRef(document.body) },
    ],
  });
  const directive = TestBed.runInInjectionContext(() => new NearestAnchorScrollHook());
  directive.ngOnDestroy();
});

it('keeps anchors aligned with fractional header heights despite browser scroll rounding', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  element('aligned', 104);
  element('next', 544);
  expect(TestBed.inject(NearestAnchorProvider).getNearestAnchor({ headerOffset: 104.5 })).toBe(
    'aligned',
  );
});

it('scrolls only the selected container without moving its ancestors', () => {
  const container = element('scroller', 100, 600);
  container.scrollTop = 30;
  container.scrollTo = vi.fn();
  const target = element('scoped', 250);
  target.scrollIntoView = vi.fn();
  TestBed.inject(ScrollService).scroll('scoped', {
    scrollable: container,
    topOffset: 20,
    behavior: 'smooth',
  });
  expect(container.scrollTo).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' });
  expect(target.scrollIntoView).not.toHaveBeenCalled();
});

it('uses explicitly selected anchors and root viewport coordinates in the facade', () => {
  TestBed.configureTestingModule({ providers: [NearestAnchorProvider] });
  const first = element('first', 16);
  element('unselected', 0);
  const root = document.documentElement;
  root.getBoundingClientRect = () => rect(-500);
  const provider = TestBed.inject(NearestAnchorProvider);
  expect(provider.getNearestAnchor({ anchors: [first], scrollable: root, headerOffset: 16 })).toBe(
    'first',
  );
  expect(
    provider.getNearestAnchor({ anchors: [first], scrollable: document.body, headerOffset: 16 }),
  ).toBe('first');
  expect(provider.getNearestAnchor({ anchors: [], scrollable: root })).toBeUndefined();
  Reflect.deleteProperty(root, 'getBoundingClientRect');
});

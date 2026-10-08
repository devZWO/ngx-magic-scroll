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
  const a = element('a', 80),
    b = element('b', 40),
    c = element('c', -10);
  expect(provider.getNearestAnchor()).toBe('b');
  element('far', 200);
  expect(provider.getNearestAnchor()).toBe('b');
  expect(provider.getNearestAnchor({ headerOffset: 60 })).toBe('a');
  element('header', 0, 50);
  expect(
    provider.getNearestAnchor({ selector: '[id="a"], [id="b"]', headerSelector: '#header' }),
  ).toBe('a');
  const container = element('container', 100);
  container.style.overflowY = 'auto';
  const host = document.createElement('div');
  container.append(host);
  host.append(a, b, c);
  expect(provider.getNearestAnchor({ hostElement: host })).toBeUndefined();
  a.getBoundingClientRect = () => rect(110);
  expect(provider.getNearestAnchor({ hostElement: host })).toBe('a');
});

describe('route fragment', () => {
  it('reads external changes, preserves parameters, clears fragments and handles failed navigation', async () => {
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
});

@Component({
  imports: [
    NearestAnchorScrollHook,
    PreserveVisibleAnchorOnResize,
    ScrollToFragmentOnFirstDataDirective,
    ScrollToFragmentOnDataChangeDirective,
  ],
  template: `<div style="overflow-y:auto">
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
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    vi.spyOn(TestBed.inject(NearestAnchorProvider), 'getNearestAnchor').mockReturnValueOnce(
      undefined,
    );
    host.prefix.set('missing-');
    fixture.detectChanges();
    TestBed.tick();
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    host.prefix.set('');
    fixture.detectChanges();
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(600);
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
  it('respects bound debounce times and later updates, and filters resize restoration by prefix', () => {
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
    vi.advanceTimersByTime(24);
    fixture.detectChanges();
    expect(host.anchor).toBe('');
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    host.debounce.set(400);
    fixture.detectChanges();
    TestBed.tick();
    provider.mockReturnValue('item-2');
    container.dispatchEvent(new Event('scroll'));
    TestBed.tick();
    vi.advanceTimersByTime(399);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-1');
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(host.anchor).toBe('item-2');
    fixture.destroy();
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

import { Component, Injector, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MagicScrollDirective } from 'ngx-magic-scroll';
import { ScrollAnchorDirective } from 'ngx-magic-scroll';
import {
  MAGIC_SCROLL_OPTIONS,
  MagicScrollOptions,
  provideMagicScroll,
  resolveMagicScrollOptions,
} from './magic-scroll-options';
import { NO_SCROLL_SOURCE, readScrollSource, ScrollSource } from './scroll-source';
import { ScrollService } from '../navigation/scroll-service';
import { NearestAnchorProvider } from '../navigation/nearest-anchor.provider';

const rect = (top: number, height = 30) => ({
  top,
  bottom: top + height,
  height,
  left: 0,
  right: 100,
  width: 100,
  x: 0,
  y: top,
  toJSON: () => ({}),
});
class Observer {
  static instances: Observer[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(readonly callback: (entries?: unknown[]) => void) {
    Observer.instances.push(this);
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', Observer);
  Observer.instances = [];
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('merges provider defaults hierarchically and preserves explicit false, zero and empty overrides', () => {
  const defaults = TestBed.inject(MAGIC_SCROLL_OPTIONS);
  expect(defaults.behavior).toEqual({ restoration: 'instant', interaction: 'smooth' });
  const root = Injector.create({ providers: [provideMagicScroll()], parent: Injector.NULL });
  expect(root.get(MAGIC_SCROLL_OPTIONS)).toEqual(defaults);
  const parent = Injector.create({
    providers: [
      provideMagicScroll({
        anchorPrefixes: ['parent-'],
        headerSelector: '.header',
        headerOffset: 64,
        bottomOffset: 32,
        activationThreshold: 0.3,
        debounceTime: 1000,
        ignoreWhenInView: 'full',
        behavior: { restoration: 'auto', interaction: 'instant' },
      }),
    ],
    parent: root,
  });
  const child = Injector.create({
    providers: [provideMagicScroll({ anchorPrefixes: ['child-'] })],
    parent,
  });
  expect(child.get(MAGIC_SCROLL_OPTIONS)).toEqual({
    ...parent.get(MAGIC_SCROLL_OPTIONS),
    anchorPrefixes: ['child-'],
    anchorSelection: 'all',
  });
  expect(
    resolveMagicScrollOptions(child.get(MAGIC_SCROLL_OPTIONS), {
      anchorPrefixes: [''],
      headerSelector: '',
      headerOffset: 0,
      bottomOffset: 0,
      activationThreshold: 0,
      debounceTime: 0,
      ignoreWhenInView: 'none',
      restoreOnDataChange: false,
      preserveOnResize: false,
      preserveOnLayoutChange: false,
      behavior: { restoration: 'smooth' },
    }),
  ).toEqual({
    anchorPrefixes: [''],
    anchorSelection: 'all',
    headerSelector: '',
    headerOffset: 0,
    bottomOffset: 0,
    activationThreshold: 0,
    debounceTime: 0,
    ignoreWhenInView: 'none',
    restoreOnDataChange: false,
    preserveOnResize: false,
    preserveOnLayoutChange: false,
    behavior: { restoration: 'smooth', interaction: 'instant' },
  });
});

it('resolves multiple anchor prefixes, empty prefix arrays, and explicit-only anchor selection strategies', () => {
  const rootDefaults = TestBed.inject(MAGIC_SCROLL_OPTIONS);

  // 1. Multiple prefixes resolution
  const multiPrefixInjector = Injector.create({
    providers: [provideMagicScroll({ anchorPrefixes: ['profile-', 'project_'] })],
  });
  expect(multiPrefixInjector.get(MAGIC_SCROLL_OPTIONS)).toEqual({
    ...rootDefaults,
    anchorPrefixes: ['profile-', 'project_'],
    anchorSelection: 'all',
  });

  // 2. Explicit-only selection strategy
  const explicitInjector = Injector.create({
    providers: [
      provideMagicScroll({
        anchorSelection: 'explicit',
        anchorPrefixes: ['ignored-prefix-'],
      }),
    ],
  });
  expect(explicitInjector.get(MAGIC_SCROLL_OPTIONS)).toEqual({
    ...rootDefaults,
    anchorPrefixes: ['ignored-prefix-'],
    anchorSelection: 'explicit',
  });

  // 3. Child overriding with empty prefix array (disables prefix matching)
  const emptyPrefixes = resolveMagicScrollOptions(multiPrefixInjector.get(MAGIC_SCROLL_OPTIONS), {
    anchorPrefixes: [],
  });
  expect(emptyPrefixes.anchorPrefixes).toEqual([]);
  expect(emptyPrefixes.anchorSelection).toBe('all');

  // 4. Overriding explicit mode back to all mode with new prefix
  const restoredAll = resolveMagicScrollOptions(explicitInjector.get(MAGIC_SCROLL_OPTIONS), {
    anchorSelection: 'all',
    anchorPrefixes: ['item-'],
  });
  expect(restoredAll.anchorSelection).toBe('all');
  expect(restoredAll.anchorPrefixes).toEqual(['item-']);
});

it('adapts omitted, plain, nested signal, resource and query sources without truthiness errors', () => {
  expect(readScrollSource(NO_SCROLL_SOURCE).ready).toBe(true);
  for (const value of [undefined, null]) {
    expect(readScrollSource(value).ready).toBe(false);
    expect(readScrollSource(signal(value)).ready).toBe(false);
  }
  for (const value of [
    [],
    0,
    false,
    '',
    {},
    { isLoading: 1 },
    { isLoading: () => false },
    { isLoading: () => false, value: 1, data: 1 },
  ]) {
    expect(readScrollSource(value)).toEqual({ ready: true, data: value });
  }
  const data = signal<unknown>(undefined);
  expect(readScrollSource(signal(data)).ready).toBe(false);
  data.set([]);
  expect(readScrollSource(signal(data))).toEqual({ ready: true, data: [] });
  const loading = signal(true);
  const query = { data, isLoading: loading };
  expect(readScrollSource(query).ready).toBe(false);
  loading.set(false);
  expect(readScrollSource(query)).toEqual({ ready: true, data: [] });
  const resource = { value: data, isLoading: loading };
  expect(readScrollSource(signal(resource))).toEqual({ ready: true, data: [] });
  const value = vi.fn(() => {
    throw new Error('Resource has no value');
  });
  const guarded = { value, isLoading: loading, hasValue: () => false };
  expect(readScrollSource(guarded).ready).toBe(false);
  expect(value).not.toHaveBeenCalled();
  expect(readScrollSource({ ...resource, hasValue: () => true })).toEqual({
    ready: true,
    data: [],
  });
});

@Component({
  imports: [MagicScrollDirective, ScrollAnchorDirective],
  template: `<div class="container" [style.overflow-y]="overflow()">
    <div magicScroll [scrollSource]="source()" [scrollOptions]="options()">
      <section id="item-1"></section>
      <section id="item-2"></section>
      <section id="other" scrollAnchor></section>
      <section [scrollAnchor]="explicitId()"></section>
      <section id="excluded"></section>
      <section id=""></section>
    </div>
  </div>`,
})
class Host {
  readonly source = signal<ScrollSource>(undefined);
  readonly options = signal<MagicScrollOptions>({ anchorPrefixes: ['item-'] });
  readonly overflow = signal('auto');
  readonly explicitId = signal('explicit');
  readonly scroll = viewChild.required(MagicScrollDirective);
}

function setup(fragment: string | null = 'item-1') {
  const routeFragment = new BehaviorSubject(fragment);
  const scroll = { scroll: vi.fn(() => true) };
  let currentNav: { extras?: { state?: unknown; info?: unknown }; trigger?: string } | null = null;
  const router = {
    createUrlTree: vi.fn(),
    navigateByUrl: vi.fn((_tree: unknown, extras?: { state?: unknown; info?: unknown }) => {
      currentNav = { extras, trigger: 'imperative' };
      return Promise.resolve(true);
    }),
    getCurrentNavigation: () => currentNav,
    get lastSuccessfulNavigation() {
      return currentNav;
    },
    setNavigation(extras?: { state?: unknown; info?: unknown }, trigger = 'imperative') {
      currentNav = { extras, trigger };
    },
  };
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      { provide: ScrollService, useValue: scroll },
      { provide: ActivatedRoute, useValue: { fragment: routeFragment, snapshot: { fragment } } },
      { provide: Router, useValue: router },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const container = fixture.nativeElement.querySelector('.container') as HTMLElement;
  const region = fixture.nativeElement.querySelector('[magicScroll]') as HTMLElement;
  container.getBoundingClientRect = () => rect(100, 500);
  region.querySelector<HTMLElement>('#item-1')!.getBoundingClientRect = () => rect(110);
  region.querySelector<HTMLElement>('#item-2')!.getBoundingClientRect = () => rect(200);
  const render = () => {
    fixture.detectChanges();
    TestBed.tick();
  };
  return { fixture, host, container, region, render, scroll, routeFragment, router };
}

it('waits for explicit undefined input, restores once, and preserves later data with the current fragment', () => {
  const { host, render, scroll, routeFragment } = setup();
  expect(scroll.scroll).not.toHaveBeenCalled();
  host.source.set([1]);
  render();
  expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
    'item-1',
    expect.objectContaining({ behavior: 'instant', topOffset: 0 }),
  );
  routeFragment.next('item-2');
  host.source.set([1, 2]);
  render();
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-2',
    expect.objectContaining({ behavior: 'instant' }),
  );
  host.options.set({ restoreOnDataChange: false });
  render();
  host.source.set([3]);
  render();
  expect(scroll.scroll).toHaveBeenCalledTimes(3);
});

it('supports static resolver content without a source and retries initial anchor when DOM element is attached', async () => {
  TestBed.overrideComponent(Host, {
    set: {
      template:
        '<div class="container"><div magicScroll><section id="item-1"></section><section id="item-2"></section></div></div>',
    },
  });
  const { fixture, render, scroll } = setup('missing');
  expect(scroll.scroll).not.toHaveBeenCalled();
  const section = document.createElement('section');
  section.id = 'missing';
  fixture.nativeElement.querySelector('[magicScroll]').append(section);
  await Promise.resolve();
  render();
  expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
    'missing',
    expect.objectContaining({ behavior: 'instant' }),
  );
});

it('combines global, local and per-call options and scopes IDs and explicit anchors', () => {
  TestBed.overrideComponent(Host, {
    add: {
      providers: [
        provideMagicScroll({
          headerOffset: 64,
          behavior: { interaction: 'auto' },
          ignoreWhenInView: 'full',
        }),
      ],
    },
  });
  const { host, region, render, scroll } = setup(null);
  host.source.set([]);
  host.options.set({
    anchorPrefixes: ['item-'],
    behavior: { interaction: 'instant' },
    headerOffset: 20,
  });
  render();
  const nested = document.createElement('div');
  nested.setAttribute('magicScroll', '');
  nested.innerHTML = '<section id="item-nested"></section>';
  region.append(nested);
  expect(host.scroll().scrollTo('excluded')).toBe(false);
  expect(host.scroll().scrollTo('item-nested')).toBe(false);
  expect(
    host
      .scroll()
      .scrollTo('#item-2', { behavior: 'smooth', topOffset: 8, ignoreWhenInView: 'none' }),
  ).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    '#item-2',
    expect.objectContaining({ behavior: 'smooth', topOffset: 8, ignoreWhenInView: 'none' }),
  );
  expect(host.scroll().activeAnchor()).toBe('item-2');
  host.scroll().scrollTo('other');
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'other',
    expect.objectContaining({ behavior: 'instant', topOffset: 20, ignoreWhenInView: 'full' }),
  );
  host.explicitId.set('renamed');
  render();
  expect(host.scroll().scrollTo('renamed')).toBe(true);
  scroll.scroll.mockReturnValueOnce(false);
  expect(host.scroll().scrollTo('item-1')).toBe(false);
  expect(host.scroll().activeAnchor()).toBe('renamed');
});

it('supports multiple anchorPrefixes and excludes non-matching and generated IDs', () => {
  const { host, region, render, scroll } = setup(null);
  host.source.set([]);

  const sec = document.createElement('section');
  sec.id = 'sec-alpha';
  const matInput = document.createElement('input');
  matInput.id = 'mat-input-42';
  region.append(sec, matInput);

  host.options.set({
    anchorPrefixes: ['item-', 'sec-'],
  });
  render();

  // Both 'item-' and 'sec-' prefixes are eligible
  expect(host.scroll().scrollTo('item-1')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith('item-1', expect.anything());

  expect(host.scroll().scrollTo('sec-alpha')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith('sec-alpha', expect.anything());

  // Explicit scrollAnchor remains eligible
  expect(host.scroll().scrollTo('other')).toBe(true);

  // Generated Angular Material control ID and unlisted prefixes are excluded
  expect(host.scroll().scrollTo('mat-input-42')).toBe(false);
  expect(host.scroll().scrollTo('excluded')).toBe(false);
});

it('enforces strict explicit-only anchor selection disregarding prefixes and generated control IDs', () => {
  const { host, region, render, scroll } = setup(null);
  host.source.set([]);

  const matInput = document.createElement('input');
  matInput.id = 'mat-mdc-form-field-0';
  region.append(matInput);

  host.options.set({
    anchorSelection: 'explicit',
    anchorPrefixes: ['item-'], // Even if prefix is provided, explicit selection overrides it
  });
  render();

  // In explicit mode, elements without data-scroll-anchor are excluded even if they match prefixes
  expect(host.scroll().scrollTo('item-1')).toBe(false);
  expect(host.scroll().scrollTo('item-2')).toBe(false);
  expect(host.scroll().scrollTo('mat-mdc-form-field-0')).toBe(false);
  expect(host.scroll().scrollTo('excluded')).toBe(false);

  // Only explicitly marked scrollAnchor elements are eligible
  expect(host.scroll().scrollTo('other')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith('other', expect.anything());
});

it('supports empty anchorPrefixes list matching only explicit markers in all-selection mode', () => {
  const { host, render, scroll } = setup(null);
  host.source.set([]);

  host.options.set({
    anchorPrefixes: [],
  });
  render();

  // With empty prefix list, prefix matching is disabled
  expect(host.scroll().scrollTo('item-1')).toBe(false);
  expect(host.scroll().scrollTo('excluded')).toBe(false);

  // Explicit markers remain eligible
  expect(host.scroll().scrollTo('other')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith('other', expect.anything());
});

it('debounces scroll spy, reacts to prefix changes and ignores scrolls before readiness', () => {
  vi.useFakeTimers();
  const { host, container, render, routeFragment, router } = setup(null);
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(1000);
  render();
  expect(router.navigateByUrl).not.toHaveBeenCalled();
  host.source.set([1]);
  host.options.set({ anchorPrefixes: ['item-'], headerOffset: 10, debounceTime: 50 });
  render();
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(49);
  render();
  expect(host.scroll().activeAnchor()).toBeNull();
  vi.advanceTimersByTime(1);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');
  host.options.set({ anchorPrefixes: ['absent-'], debounceTime: 0 });
  // Explicit anchors remain eligible; remove them to exercise no nearest target.
  container.querySelectorAll('[data-scroll-anchor]').forEach((el) => el.remove());
  render();
  container.dispatchEvent(new Event('scroll'));
  vi.runOnlyPendingTimers();
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');
  routeFragment.next('external');
  render();
  expect(host.scroll().activeAnchor()).toBe('external');
});

it('passes bottomOffset from provider defaults and per-region scrollOptions to nearest anchor evaluation', () => {
  vi.useFakeTimers();
  TestBed.overrideComponent(Host, {
    add: {
      providers: [provideMagicScroll({ bottomOffset: 100 })],
    },
  });
  const { host, container, render } = setup(null);
  container.querySelectorAll('[data-scroll-anchor]').forEach((el) => el.remove());
  host.source.set([1]);
  render();

  const item1 = container.querySelector('#item-1') as HTMLElement;
  const item2 = container.querySelector('#item-2') as HTMLElement;
  container.getBoundingClientRect = () => rect(0, 500);
  item1.getBoundingClientRect = () => rect(-100, 300);
  item2.getBoundingClientRect = () => rect(350, 100);

  // With global bottomOffset: 100, container bottomBoundary is 500 - 100 = 400.
  // item2 (bottom 450 > 400) is excluded from full containment, so item1 (reading line) is active.
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(500);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');

  // Override locally with bottomOffset: 20 -> bottomBoundary = 500 - 20 = 480.
  // item2 (bottom 450 <= 480) is now fully contained and selected.
  host.options.set({ anchorPrefixes: ['item-'], bottomOffset: 20, debounceTime: 50 });
  render();
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(50);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-2');
});

it('passes activationThreshold from provider defaults and per-region scrollOptions to nearest anchor evaluation', () => {
  vi.useFakeTimers();
  TestBed.overrideComponent(Host, {
    add: {
      providers: [provideMagicScroll({ activationThreshold: 0.5 })],
    },
  });
  const { host, container, render } = setup(null);
  container.querySelectorAll('[data-scroll-anchor]').forEach((el) => el.remove());
  host.source.set([1]);
  render();

  const item1 = container.querySelector('#item-1') as HTMLElement;
  const item2 = container.querySelector('#item-2') as HTMLElement;
  container.getBoundingClientRect = () => rect(0, 600);
  item1.getBoundingClientRect = () => rect(-200, 800);
  item2.getBoundingClientRect = () => rect(350, 1000); // top 350 > 300 (midpoint of [0, 600])

  // With global activationThreshold: 0.5, triggerLine = 0 + 600 * 0.5 = 300.
  // item2 top 350 > 300, so item1 (reading line) is active.
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(500);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');

  // Override locally with activationThreshold: 0.7 -> triggerLine = 600 * 0.7 = 420.
  // item2 (top 350 <= 420) crosses the 70% threshold and becomes active.
  host.options.set({ anchorPrefixes: ['item-'], activationThreshold: 0.7, debounceTime: 50 });
  render();
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(50);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-2');
});

it('uses a scrollable host, switches to document scrolling on resize and tears down listeners', () => {
  vi.useFakeTimers();
  const { fixture, host, container, region, render, scroll } = setup();
  host.source.set([1]);
  region.style.overflowY = 'auto';
  render();
  host.scroll().scrollTo('item-1');
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-1',
    expect.objectContaining({ scrollable: region }),
  );
  region.style.overflowY = 'scroll';
  render();
  host.scroll().scrollTo('item-2');
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-2',
    expect.objectContaining({ scrollable: region }),
  );
  window.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new Event('resize'));
  const remove = vi.spyOn(region, 'removeEventListener');
  region.style.overflowY = 'visible';
  host.overflow.set('visible');
  render();
  const add = vi.spyOn(document, 'addEventListener');
  window.dispatchEvent(new Event('resize'));
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  expect(add).toHaveBeenCalledWith('scroll', expect.any(Function));
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-2',
    expect.objectContaining({ scrollable: undefined, behavior: 'instant' }),
  );
  host.options.set({ preserveOnResize: false });
  render();
  const calls = scroll.scroll.mock.calls.length;
  window.dispatchEvent(new Event('resize'));
  expect(scroll.scroll).toHaveBeenCalledTimes(calls);
  const removeDocument = vi.spyOn(document, 'removeEventListener');
  document.dispatchEvent(new Event('scroll'));
  fixture.destroy();
  vi.runOnlyPendingTimers();
  expect(removeDocument).toHaveBeenCalledWith('scroll', expect.any(Function));
  container.dispatchEvent(new Event('scroll'));
  expect(scroll.scroll).toHaveBeenCalledTimes(calls);
});

it('measures a header before initial restore and observes height changes with cleanup', () => {
  const header = document.createElement('header');
  header.id = 'test-header';
  let height = 64;
  header.getBoundingClientRect = () => rect(0, height);
  document.body.append(header);
  const { fixture, host, render, scroll } = setup();
  host.options.set({ headerSelector: '#test-header', headerOffset: 16 });
  render();
  expect(host.scroll().headerHeight()).toBe(64);
  expect(host.scroll().offset()).toBe(80);
  const observer = Observer.instances.at(-1)!;
  observer.callback(); // Same size should not scroll.
  height = 100;
  observer.callback(); // Not ready yet should not restore.
  expect(scroll.scroll).not.toHaveBeenCalled();
  host.source.set([1]);
  render();
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-1',
    expect.objectContaining({ topOffset: 116 }),
  );
  height = 120;
  observer.callback();
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-1',
    expect.objectContaining({ topOffset: 136, behavior: 'instant' }),
  );
  host.options.set({ headerSelector: '#test-header', headerOffset: 16, preserveOnResize: false });
  render();
  const disabled = Observer.instances.at(-1)!;
  const calls = scroll.scroll.mock.calls.length;
  height = 140;
  disabled.callback();
  expect(host.scroll().offset()).toBe(156);
  expect(scroll.scroll).toHaveBeenCalledTimes(calls);
  host.options.set({ headerSelector: '#missing', preserveOnResize: false });
  render();
  expect(host.scroll().headerHeight()).toBe(0);
  fixture.destroy();
  expect(observer.disconnect).toHaveBeenCalledOnce();
  expect(disabled.disconnect).toHaveBeenCalledOnce();
  header.remove();
});

it('can destroy before rendering, including a server document without a window', () => {
  const { fixture } = setup();
  // A second fixture has not registered its render-time listener yet.
  const second = TestBed.createComponent(Host);
  vi.spyOn(document, 'defaultView', 'get').mockReturnValue(null);
  second.destroy();
  fixture.destroy();
});

it('restores already-rendered resolver content once without a scrollSource binding', () => {
  TestBed.overrideComponent(Host, {
    set: {
      template:
        '<div class="container"><div magicScroll><section id="item-1"></section><section id="item-2"></section></div></div>',
    },
  });
  const { render, scroll } = setup('item-2');
  expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
    'item-2',
    expect.objectContaining({ behavior: 'instant' }),
  );
  render();
  expect(scroll.scroll).toHaveBeenCalledOnce();
});

it('tracks a signal source directly rather than treating its function as loaded data', () => {
  const { host, render, scroll } = setup();
  const items = signal<unknown>(undefined);
  host.source.set(items);
  render();
  expect(scroll.scroll).not.toHaveBeenCalled();
  items.set([]);
  render();
  expect(scroll.scroll).toHaveBeenCalledOnce();
});

it('uses document scrolling when a body or html overflow style defines the scroll root', () => {
  const { host, region, render, scroll } = setup();
  host.overflow.set('visible');
  region.style.overflowY = 'visible';
  host.source.set([]);
  render();
  for (const root of [document.body, document.documentElement]) {
    const previous = root.style.overflowY;
    root.style.overflowY = 'auto';
    window.dispatchEvent(new Event('resize'));
    host.scroll().scrollTo('item-2');
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ scrollable: undefined }),
    );
    root.style.overflowY = previous;
  }
});

it('uses live active section rather than stale URL fragment during data/resize corrections within debounce window', () => {
  vi.useFakeTimers();
  const { host, container, region, render, scroll } = setup('item-1');
  host.options.set({ anchorPrefixes: ['item-'], debounceTime: 500 });
  host.source.set([1]);
  render();
  expect(scroll.scroll).toHaveBeenLastCalledWith('item-1', expect.anything());

  // Simulate scrolling from item-1 to item-2: item-2 is now visible at top
  region.querySelector<HTMLElement>('#item-1')!.getBoundingClientRect = () => rect(-400);
  region.querySelector<HTMLElement>('#item-2')!.getBoundingClientRect = () => rect(110);
  container.dispatchEvent(new Event('scroll'));

  // Only advance 50ms (well within 500ms debounce window). URL fragment is still 'item-1'.
  vi.advanceTimersByTime(50);
  render();

  // Data update triggers preservation
  host.source.set([1, 2]);
  render();

  // Preservation must target live section 'item-2', NOT stale fragment 'item-1'
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'item-2',
    expect.objectContaining({ behavior: 'instant' }),
  );
});

it('cancels pending initial restoration when user wheel/touch/key intent is detected before data readiness', () => {
  const { host, container, render, scroll } = setup('item-2');
  expect(scroll.scroll).not.toHaveBeenCalled();

  // User scrolls with wheel before scrollSource is ready
  container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));

  // Data source arrives
  host.source.set([1, 2]);
  render();

  // Initial restoration should be aborted due to intervening user intent
  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('ignores key events from inputs, textareas, select dropdowns, and contenteditable elements', () => {
  const { host, container, render, scroll } = setup('item-2');
  expect(scroll.scroll).not.toHaveBeenCalled();

  const input = document.createElement('input');
  const textarea = document.createElement('textarea');
  const select = document.createElement('select');
  const editableDiv = document.createElement('div');
  editableDiv.contentEditable = 'true';
  editableDiv.setAttribute('contenteditable', 'true');
  const editableSpan = document.createElement('span');
  editableDiv.appendChild(editableSpan);

  // SVG element inside contenteditable where isContentEditable is undefined/false on SVGElement
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svgEl.appendChild(pathEl);
  editableDiv.appendChild(svgEl);

  container.appendChild(input);
  container.appendChild(textarea);
  container.appendChild(select);
  container.appendChild(editableDiv);

  for (const el of [input, textarea, select, editableDiv, editableSpan, pathEl]) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  }

  // Data source arrives
  host.source.set([1, 2]);
  render();

  // Initial restoration proceeds because all keydowns were on editable elements
  expect(scroll.scroll).toHaveBeenCalledWith('item-2', expect.anything());
});

it('cancels pending initial restoration on touchstart and touchmove gestures', () => {
  const { host, container, render, scroll } = setup('item-2');
  expect(scroll.scroll).not.toHaveBeenCalled();

  container.dispatchEvent(new Event('touchstart', { bubbles: true }));

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('cancels pending initial restoration on touchmove gesture', () => {
  const { host, container, render, scroll } = setup('item-2');
  expect(scroll.scroll).not.toHaveBeenCalled();

  container.dispatchEvent(new Event('touchmove', { bubbles: true }));

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('ignores non-keyboard events and non-scroll keys during keyboard intent interception', () => {
  const { host, container, render, scroll } = setup('item-2');
  expect(scroll.scroll).not.toHaveBeenCalled();

  // Dispatch non-KeyboardEvent
  container.dispatchEvent(new CustomEvent('keydown', { bubbles: true }));
  // Dispatch non-scroll keys
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'KeyA', bubbles: true }));
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

  host.source.set([1, 2]);
  render();

  // Initial restoration still proceeds
  expect(scroll.scroll).toHaveBeenCalledWith('item-2', expect.anything());
});

it('cancels initial restoration when scroll keys target document.body', () => {
  const { host, render, scroll } = setup('item-2');
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('cancels initial restoration when scroll keys target document.documentElement', () => {
  const { host, render, scroll } = setup('item-2');
  document.documentElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
  );

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('cancels initial restoration when scroll keys target window or host elements', () => {
  const { host, region, render, scroll } = setup('item-2');
  const child = region.querySelector('#item-1')!;
  child.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('cancels initial restoration when keyboard event has a null target', () => {
  const { host, container, render, scroll } = setup('item-2');
  const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
  Object.defineProperty(event, 'target', { value: null });
  container.dispatchEvent(event);

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

it('cancels initial restoration when keyboard event occurs in document scroll context', () => {
  const { host, region, render, scroll } = setup('item-2');
  host.overflow.set('visible');
  region.style.overflowY = 'visible';
  render();

  const externalDiv = document.createElement('div');
  document.body.appendChild(externalDiv);
  try {
    externalDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    host.source.set([1, 2]);
    render();

    expect(scroll.scroll).not.toHaveBeenCalled();
  } finally {
    externalDiv.remove();
  }
});

it('does not cancel initial restoration when scroll keys originate from unrelated external DOM elements', () => {
  const { host, render, scroll } = setup('item-2');

  const externalContainer = document.createElement('div');
  const externalButton = document.createElement('button');
  externalContainer.appendChild(externalButton);
  document.body.appendChild(externalContainer);

  try {
    // Dispatch scroll keydown from external element without bubbling to body
    externalButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: false }),
    );

    host.source.set([1, 2]);
    render();

    // Initial restoration still proceeds
    expect(scroll.scroll).toHaveBeenCalledWith('item-2', expect.anything());
  } finally {
    externalContainer.remove();
  }
});

it('ignores scroll events before initialization and handles undefined nearest anchor gracefully', () => {
  vi.useFakeTimers();
  const { host, container, region, render, scroll } = setup('item-1');

  // Scroll event before initialization (source is still undefined)
  container.dispatchEvent(new Event('scroll'));
  render();
  expect(scroll.scroll).not.toHaveBeenCalled();

  // Now initialize
  host.source.set([1, 2]);
  render();
  expect(scroll.scroll).toHaveBeenCalledWith('item-1', expect.anything());

  // Make calculateNearestAnchor return undefined by putting all anchors out of view
  for (const el of region.querySelectorAll<HTMLElement>('[id]')) {
    el.getBoundingClientRect = () => rect(-9999);
  }

  // Scroll event with undefined nearest anchor
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(500);
  render();

  // No errors thrown, preservation with live anchor remains unaffected
  expect(scroll.scroll).toHaveBeenCalled();
});

it('allows explicit scrollTo after user cancellation without inhibition', () => {
  const { host, container, render, scroll } = setup('item-2');
  container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));

  host.source.set([1, 2]);
  render();
  expect(scroll.scroll).not.toHaveBeenCalled();

  // Explicit user scrollTo must still work smoothly
  expect(host.scroll().scrollTo('item-1')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith('item-1', expect.anything());
});

it('sets liveAnchor to null on user interruption when no nearest anchor is found during initialization', () => {
  const { host, container, region, render, scroll } = setup('item-2');
  for (const el of region.querySelectorAll<HTMLElement>('[id], [data-scroll-anchor]')) {
    el.removeAttribute('id');
    el.removeAttribute('data-scroll-anchor');
  }
  container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));

  host.source.set([1, 2]);
  render();

  expect(scroll.scroll).not.toHaveBeenCalled();
});

describe('subsequent router fragment navigation', () => {
  it('automatically scrolls to target anchor on subsequent external router navigation with restoration behavior', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
      'item-1',
      expect.objectContaining({ behavior: 'instant' }),
    );

    // Subsequent external router navigation
    routeFragment.next('item-2');
    render();

    expect(scroll.scroll).toHaveBeenCalledTimes(2);
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('uses configured behavior.restoration for subsequent router navigations', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    host.options.set({ anchorPrefixes: ['item-'], behavior: { restoration: 'smooth' } });
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ behavior: 'smooth' }),
    );

    routeFragment.next('item-2');
    render();

    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });

  it('queues navigation when scrollSource is loading and executes once data is ready', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    // Initially loaded with item-1
    host.source.set([1]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Source becomes loading
    const loading = signal(true);
    const data = signal<unknown[] | undefined>(undefined);
    host.source.set({ data, isLoading: loading });
    render();

    // Subsequent external router navigation occurs while loading
    routeFragment.next('item-2');
    render();

    // Should not scroll immediately since data is not ready
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Data finishes loading
    data.set([1, 2]);
    loading.set(false);
    render();

    // Now it should scroll to item-2
    expect(scroll.scroll).toHaveBeenCalledTimes(2);
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('queues navigation when target DOM element is not yet rendered and executes once rendered', () => {
    const { fixture, host, render, scroll, routeFragment } = setup('item-1');
    host.source.set([1]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // External navigation to a dynamic anchor not yet in DOM
    routeFragment.next('item-dynamic');
    render();

    // Not yet in DOM -> not scrolled
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Dynamic section is rendered into DOM and source updates
    const section = document.createElement('section');
    section.id = 'item-dynamic';
    fixture.nativeElement.querySelector('[magicScroll]').append(section);
    host.source.set([1, 2]);
    render();

    expect(scroll.scroll).toHaveBeenCalledTimes(2);
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-dynamic',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('cancels older pending destination when a newer navigation arrives before readiness', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    const loading = signal(true);
    const data = signal<unknown[] | undefined>(undefined);
    host.source.set({ data, isLoading: loading });
    render();

    // Initial item-1 pending
    expect(scroll.scroll).not.toHaveBeenCalled();

    // Navigate rapidly to item-2 before ready
    routeFragment.next('item-2');
    render();
    expect(scroll.scroll).not.toHaveBeenCalled();

    // Data becomes ready
    data.set([1, 2]);
    loading.set(false);
    render();

    // Only item-2 should be executed, not item-1
    expect(scroll.scroll).toHaveBeenCalledTimes(1);
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('cancels pending destination when user manual interaction occurs before data readiness', () => {
    const { host, container, render, scroll, routeFragment } = setup('item-1');
    const loading = signal(true);
    const data = signal<unknown[] | undefined>(undefined);
    host.source.set({ data, isLoading: loading });
    render();

    // Navigation occurs while loading
    routeFragment.next('item-2');
    render();
    expect(scroll.scroll).not.toHaveBeenCalled();

    // User scrolls manually with mouse wheel
    container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));

    // Data finishes loading
    data.set([1, 2]);
    loading.set(false);
    render();

    // Restoration must NOT execute because user interacted
    expect(scroll.scroll).not.toHaveBeenCalled();
  });

  it('cancels pending destination on keyboard scroll navigation before data readiness', () => {
    const { host, container, render, scroll, routeFragment } = setup('item-1');
    const loading = signal(true);
    const data = signal<unknown[] | undefined>(undefined);
    host.source.set({ data, isLoading: loading });
    render();

    routeFragment.next('item-2');
    render();
    expect(scroll.scroll).not.toHaveBeenCalled();

    // User presses ArrowDown key
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // Data finishes loading
    data.set([1, 2]);
    loading.set(false);
    render();

    // Restoration must NOT execute
    expect(scroll.scroll).not.toHaveBeenCalled();
  });

  it('does not scroll on query-only navigation when fragment is unchanged or absent', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Emitting same fragment (e.g. from query param update)
    routeFragment.next('item-1');
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Emitting null fragment
    routeFragment.next(null);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);
  });

  it('does not trigger scrolling on internal scroll-spy fragment updates', () => {
    vi.useFakeTimers();
    const { host, container, render, scroll } = setup('item-1');
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // User scrolls to item-2 (internal scroll event)
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(500);
    render();

    // Internal scroll-spy updates URL fragment, but must NOT trigger an automated scroll action
    expect(scroll.scroll).toHaveBeenCalledTimes(1);
  });

  it('does not scroll or throw when external navigation target is missing or in another region', () => {
    const { host, render, scroll, routeFragment } = setup('item-1');
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // External navigation to non-existent target
    routeFragment.next('non-existent');
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // External target in separate element outside magicScroll region
    const outsideEl = document.createElement('div');
    outsideEl.id = 'item-outside';
    document.body.appendChild(outsideEl);
    try {
      routeFragment.next('item-outside');
      render();
      expect(scroll.scroll).toHaveBeenCalledTimes(1);
    } finally {
      outsideEl.remove();
    }
  });

  it('cleans up pending router navigation on directive teardown', () => {
    const { fixture, host, render, scroll, routeFragment } = setup('item-1');
    const loading = signal(true);
    const data = signal<unknown[] | undefined>(undefined);
    host.source.set({ data, isLoading: loading });
    render();

    routeFragment.next('item-2');
    render();
    expect(scroll.scroll).not.toHaveBeenCalled();

    // Destroy fixture
    fixture.destroy();

    // Finish loading after destroy
    data.set([1, 2]);
    loading.set(false);

    expect(scroll.scroll).not.toHaveBeenCalled();
  });

  it('origin tagging ensures sibling magicScroll regions do not misinterpret internal scroll-spy events as external navigations', () => {
    @Component({
      imports: [MagicScrollDirective],
      template: `
        <div class="container-a">
          <div class="region-a" magicScroll [scrollSource]="sourceA()">
            <section id="a-1"></section>
            <section id="a-2"></section>
          </div>
        </div>
        <div class="container-b">
          <div class="region-b" magicScroll [scrollSource]="sourceB()">
            <section id="b-1"></section>
            <section id="b-2"></section>
          </div>
        </div>
      `,
    })
    class SiblingHost {
      readonly sourceA = signal<unknown[]>([1, 2]);
      readonly sourceB = signal<unknown[]>([1, 2]);
    }

    vi.useFakeTimers();
    const routeFragment = new BehaviorSubject<string | null>('a-1');
    const scroll = { scroll: vi.fn(() => true) };
    let currentNav: { extras?: { state?: unknown; info?: unknown }; trigger?: string } | null =
      null;
    const router = {
      createUrlTree: vi.fn(),
      navigateByUrl: vi.fn((_tree: unknown, extras?: { state?: unknown; info?: unknown }) => {
        currentNav = { extras, trigger: 'imperative' };
        return Promise.resolve(true);
      }),
      getCurrentNavigation: () => currentNav,
      get lastSuccessfulNavigation() {
        return currentNav;
      },
    };

    TestBed.configureTestingModule({
      imports: [SiblingHost],
      providers: [
        { provide: ScrollService, useValue: scroll },
        {
          provide: ActivatedRoute,
          useValue: { fragment: routeFragment, snapshot: { fragment: 'a-1' } },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(SiblingHost);
    fixture.detectChanges();
    const containerA = fixture.nativeElement.querySelector('.region-a') as HTMLElement;
    const containerB = fixture.nativeElement.querySelector('.region-b') as HTMLElement;
    containerA.querySelector<HTMLElement>('#a-1')!.getBoundingClientRect = () => rect(100);
    containerA.querySelector<HTMLElement>('#a-2')!.getBoundingClientRect = () => rect(200);
    containerB.querySelector<HTMLElement>('#b-1')!.getBoundingClientRect = () => rect(100);
    containerB.querySelector<HTMLElement>('#b-2')!.getBoundingClientRect = () => rect(200);

    const render = () => {
      fixture.detectChanges();
      TestBed.tick();
    };

    render();
    // Initial restoration for 'a-1' in Region A
    expect(scroll.scroll).toHaveBeenCalledWith('a-1', expect.anything());
    const initialCallCount = scroll.scroll.mock.calls.length;

    // Region A scrolls internally to a-2
    containerA.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(500);
    render();

    // Sibling Region B must NOT scroll or misinterpret Region A's scroll-spy update
    expect(scroll.scroll).toHaveBeenCalledTimes(initialCallCount);

    // External navigation occurs to 'b-2' without internal scroll-spy marker
    currentNav = { extras: {}, trigger: 'imperative' };
    routeFragment.next('b-2');
    render();

    // Region B restores scroll for external navigation to 'b-2'
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'b-2',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('restores scroll on browser history popstate navigation even when state is present', () => {
    const { host, render, scroll, routeFragment, router } = setup('item-1');
    host.source.set([1, 2]);
    render();
    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Browser back button triggers popstate navigation with state
    router.setNavigation({ state: { __ngx_magic_scroll_origin: 'scroll-spy' } }, 'popstate');
    routeFragment.next('item-2');
    render();

    // Must be treated as external and restore scroll because trigger is popstate
    expect(scroll.scroll).toHaveBeenLastCalledWith(
      'item-2',
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('correctly reads signal-based lastSuccessfulNavigation and recognizes internal origin', () => {
    const routeFragment = new BehaviorSubject<string | null>('item-1');
    const scroll = { scroll: vi.fn(() => true) };
    const navSignal = signal<{
      extras: { info: Record<string, string> };
      trigger: string;
    } | null>({
      extras: { info: { __ngx_magic_scroll_origin: 'scroll-spy' } },
      trigger: 'imperative',
    });
    const router = {
      createUrlTree: vi.fn(),
      navigateByUrl: vi.fn(async () => true),
      getCurrentNavigation: vi.fn(() => null),
      lastSuccessfulNavigation: navSignal,
    };

    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        { provide: ScrollService, useValue: scroll },
        {
          provide: ActivatedRoute,
          useValue: { fragment: routeFragment, snapshot: { fragment: 'item-1' } },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    host.source.set([1, 2]);
    fixture.detectChanges();
    TestBed.tick();

    expect(scroll.scroll).toHaveBeenCalledTimes(1);

    // Internal scroll-spy navigation reflected via lastSuccessfulNavigation signal
    routeFragment.next('item-2');
    fixture.detectChanges();
    TestBed.tick();

    // Must not trigger external restoration
    expect(scroll.scroll).toHaveBeenCalledTimes(1);
  });

  describe('bounded post-render retry for delayed DOM destinations', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries pending destination when target DOM element is rendered after scroll source becomes ready (initial load)', async () => {
      const { fixture, host, render, scroll } = setup('item-3');
      host.source.set([1, 2, 3]);
      render();

      // Initially, target #item-3 is not yet present in DOM, so scroll is not called
      expect(scroll.scroll).not.toHaveBeenCalled();

      // Target element is rendered in a subsequent render cycle
      const section = document.createElement('section');
      section.id = 'item-3';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      await Promise.resolve();
      render();

      // Pending destination is retried and successfully executed
      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
        'item-3',
        expect.objectContaining({ behavior: 'instant' }),
      );
    });

    it('retries pending destination when external route fragment navigation occurs before target DOM element renders', async () => {
      const { fixture, host, render, scroll, routeFragment } = setup('item-1');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith('item-1', expect.anything());

      // Subsequent external navigation to item-3
      routeFragment.next('item-3');
      render();

      // #item-3 is not yet rendered
      expect(scroll.scroll).toHaveBeenCalledTimes(1);

      // #item-3 is inserted into DOM
      const section = document.createElement('section');
      section.id = 'item-3';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      await Promise.resolve();
      render();

      // Retries and executes external navigation
      expect(scroll.scroll).toHaveBeenCalledTimes(2);
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-3',
        expect.objectContaining({ behavior: 'instant' }),
      );
    });

    it('cancels pending destination retry when user scrolls via wheel gesture', () => {
      const { fixture, host, container, render, scroll } = setup('item-deferred');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // User interacts with container via wheel
      container.dispatchEvent(new Event('wheel'));

      // Target element is rendered afterwards
      const section = document.createElement('section');
      section.id = 'item-deferred';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      render();

      // Pending destination was canceled, so scroll should not be executed
      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('cancels pending destination retry when user scrolls via touch gesture', () => {
      const { fixture, host, container, render, scroll } = setup('item-touch-deferred');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // User interacts via touchstart
      container.dispatchEvent(new Event('touchstart'));

      // Target is rendered afterwards
      const section = document.createElement('section');
      section.id = 'item-touch-deferred';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('cancels pending destination retry when user navigates via keyboard in scroll context', () => {
      const { fixture, host, container, render, scroll } = setup('item-key-deferred');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // User presses ArrowDown on container
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      // Target is rendered afterwards
      const section = document.createElement('section');
      section.id = 'item-key-deferred';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('supersedes existing pending destination when a new external navigation arrives', () => {
      const { fixture, host, render, scroll, routeFragment } = setup('item-first');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // New external navigation supersedes item-first with item-2 (which exists in DOM)
      routeFragment.next('item-2');
      render();

      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
        'item-2',
        expect.objectContaining({ behavior: 'instant' }),
      );

      // Rendering item-first now should not trigger scroll to item-first
      const section = document.createElement('section');
      section.id = 'item-first';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      render();

      expect(scroll.scroll).toHaveBeenCalledTimes(1);
    });

    it('supersedes pending destination when explicit scrollTo is executed', () => {
      const { fixture, host, render, scroll } = setup('item-deferred');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // Explicit scrollTo to item-2
      expect(host.scroll().scrollTo('item-2')).toBe(true);
      expect(scroll.scroll).toHaveBeenCalledTimes(1);

      // Item deferred renders later
      const section = document.createElement('section');
      section.id = 'item-deferred';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      render();

      // Must not trigger deferred scroll
      expect(scroll.scroll).toHaveBeenCalledTimes(1);
    });

    it('stops retrying non-existent target anchor gracefully after timeout window', () => {
      const { host, render, scroll } = setup('item-non-existent');
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // Advance time beyond retry timeout
      vi.advanceTimersByTime(2000);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('schedules retry when data updates while a destination is pending and not yet rendered in DOM', async () => {
      const { fixture, host, render, scroll, routeFragment } = setup('item-1');
      host.source.set([1]);
      render();

      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith('item-1', expect.anything());

      // Navigate to a new fragment that does not exist in DOM yet
      routeFragment.next('item-deferred-data');
      render();

      // Data updates while destination is still pending
      host.source.set([1, 2]);
      render();

      expect(scroll.scroll).toHaveBeenCalledTimes(1);

      // Element is rendered
      const section = document.createElement('section');
      section.id = 'item-deferred-data';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      await Promise.resolve();
      render();

      expect(scroll.scroll).toHaveBeenCalledTimes(2);
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-deferred-data',
        expect.objectContaining({ behavior: 'instant' }),
      );
    });

    it('cleans up observer if mutation callback executes after user interruption', async () => {
      const { fixture, host, container, render, scroll } = setup('item-interrupted-before-flush');
      host.source.set([1]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // DOM mutation occurs
      const section = document.createElement('section');
      section.id = 'unrelated';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);

      // User interacts before mutation observer microtask finishes
      container.dispatchEvent(new Event('wheel'));

      await Promise.resolve();
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('does not execute pending destination during mutation if scroll source is not ready', async () => {
      const { fixture, host, render, scroll } = setup('item-not-ready-yet');
      host.source.set([1]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // Source becomes not ready (e.g., refetching)
      host.source.set(undefined);
      render();

      // DOM mutation occurs while source is not ready
      const section = document.createElement('section');
      section.id = 'item-not-ready-yet';
      fixture.nativeElement.querySelector('[magicScroll]').append(section);
      await Promise.resolve();
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // Source becomes ready again
      host.source.set([1, 2]);
      await Promise.resolve();
      render();

      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
        'item-not-ready-yet',
        expect.objectContaining({ behavior: 'instant' }),
      );
    });

    it('cancels pending initial destination retry on user interruption and does not trigger retry on subsequent data changes', () => {
      const { container, host, render, scroll } = setup('item-not-ready');
      host.source.set([1]);
      render();

      expect(scroll.scroll).not.toHaveBeenCalled();

      // User interrupts while destination is still pending
      container.dispatchEvent(new Event('wheel'));

      // Subsequent data change arrives with restoreOnDataChange: false
      host.options.set({ restoreOnDataChange: false });
      host.source.set([1, 2]);
      render();

      // Canceled initial destination should not have been executed
      expect(scroll.scroll).not.toHaveBeenCalled();
    });

    it('cleans up retry observer and timers when directive is destroyed', () => {
      const { fixture, host, render, scroll } = setup('item-destroy-test');
      host.source.set([1, 2]);
      render();

      fixture.destroy();

      const section = document.createElement('section');
      section.id = 'item-destroy-test';
      expect(() => {
        fixture.nativeElement.querySelector?.('[magicScroll]')?.append(section);
        vi.advanceTimersByTime(1000);
      }).not.toThrow();

      expect(scroll.scroll).not.toHaveBeenCalled();
    });
  });

  describe('Section-Relative Position Preservation (Issue #5 / Proposal 3b)', () => {
    it('captures anchor-relative displacement on scroll and restores exact displacement on data updates', () => {
      const { container, region, host, render, scroll } = setup('item-1');
      host.source.set([1]);
      render();

      expect(scroll.scroll).toHaveBeenCalledExactlyOnceWith(
        'item-1',
        expect.objectContaining({ behavior: 'instant', displacement: 0 }),
      );

      // item-1 is a tall card spanning past viewport; place all other anchors offscreen
      region.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
        el.getBoundingClientRect = () => (el.id === 'item-1' ? rect(-250, 1000) : rect(2000, 2500));
      });

      // Simulate user scrolling 350px deep into item-1
      // container top = 100, offset = 0, topBoundary = 100.
      // item-1 top = -250 => displacement = -250 - 100 = -350.
      container.dispatchEvent(new Event('scroll'));

      // New data items prepended
      host.source.set([1, 2, 3]);
      render();

      // Data reflow should preserve the -350px displacement without a visibility opt-out
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-1',
        expect.objectContaining({
          behavior: 'instant',
          displacement: -350,
        }),
      );
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-1',
        expect.not.objectContaining({
          ignoreWhenInView: 'top',
        }),
      );
    });

    it('does not skip preservation when anchor top remains visible', () => {
      const { container, region, host, render, scroll } = setup('item-1');
      host.source.set([1]);
      render();

      // Heading is visible below the activation boundary (e.g. displacement = 50px)
      region.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
        el.getBoundingClientRect = () => (el.id === 'item-1' ? rect(150, 600) : rect(2000, 2500));
      });
      container.dispatchEvent(new Event('scroll'));

      // Small prepend occurs, triggering data-change preservation
      host.source.set([1, 2]);
      render();

      // Must execute preservation without visibility opt-out
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-1',
        expect.objectContaining({
          behavior: 'instant',
          displacement: 50,
        }),
      );
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-1',
        expect.not.objectContaining({
          ignoreWhenInView: 'top',
        }),
      );
    });

    it('resets savedDisplacement to 0 on explicit scrollTo and external router navigation', () => {
      const { container, region, host, render, scroll, routeFragment, router } = setup('item-1');
      host.source.set([1]);
      render();

      // Position item-1 active, others offscreen
      region.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
        el.getBoundingClientRect = () => (el.id === 'item-1' ? rect(-200, 800) : rect(2000, 2500));
      });
      container.dispatchEvent(new Event('scroll'));

      // Explicit navigation to item-2 enforces displacement 0 even if callers attempt overrides
      (host.scroll().scrollTo as (anchor: string, opts: unknown) => boolean)('item-2', {
        displacement: -123,
        behavior: 'smooth',
      });
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-2',
        expect.objectContaining({ behavior: 'smooth', displacement: 0 }),
      );

      // Subsequent external router fragment navigation to item-1 also resets displacement
      router.setNavigation(undefined, 'imperative');
      routeFragment.next('other');
      render();
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'other',
        expect.objectContaining({ displacement: 0 }),
      );
    });

    it('covers document-level scrolling displacement, missing anchors, and null liveAnchor preservation', () => {
      const { region, host, render, scroll } = setup(null);
      host.source.set([]);
      host.overflow.set('visible');
      render();

      // Trigger resize when liveAnchor is null (line 535: if (!anchor) return)
      host.options.set({ anchorPrefixes: ['item-'], preserveOnResize: true });
      window.dispatchEvent(new Event('resize'));
      render();

      // Document-level scrolling: container is document
      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      item1.getBoundingClientRect = () => rect(200, 800);
      region.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
        el.getBoundingClientRect = () => (el.id === 'item-1' ? rect(200, 800) : rect(2000, 2500));
      });

      document.dispatchEvent(new Event('scroll'));

      // Data change preserves document displacement
      host.source.set([1]);
      render();

      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          displacement: 200,
        }),
      );

      // Trigger scroll when nearest returns an unlisted ghost anchor (line 551: if (!anchorEl) return)
      vi.spyOn(NearestAnchorProvider.prototype, 'getNearestAnchor').mockReturnValueOnce(
        'ghost-anchor',
      );
      document.dispatchEvent(new Event('scroll'));
    });
  });

  describe('accessible focus transfer ({ focus: true })', () => {
    it('transfers focus directly to naturally focusable elements and elements with explicit tabindex', () => {
      const { region, host, render } = setup(null);
      host.source.set([]);
      render();

      const button = document.createElement('button');
      button.id = 'item-button';
      button.textContent = 'Action';

      const link = document.createElement('a');
      link.id = 'item-link';
      link.href = '#target';

      const input = document.createElement('input');
      input.id = 'item-input';

      const select = document.createElement('select');
      select.id = 'item-select';

      const textarea = document.createElement('textarea');
      textarea.id = 'item-textarea';

      const iframe = document.createElement('iframe');
      iframe.id = 'item-iframe';

      const tabindexedZero = document.createElement('div');
      tabindexedZero.id = 'item-tabindex-0';
      tabindexedZero.setAttribute('tabindex', '0');

      const tabindexedNeg = document.createElement('div');
      tabindexedNeg.id = 'item-tabindex-neg';
      tabindexedNeg.setAttribute('tabindex', '-1');

      region.append(button, link, input, select, textarea, iframe, tabindexedZero, tabindexedNeg);

      const elements = [
        { el: button, name: 'button' },
        { el: link, name: 'link' },
        { el: input, name: 'input' },
        { el: select, name: 'select' },
        { el: textarea, name: 'textarea' },
        { el: iframe, name: 'iframe' },
        { el: tabindexedZero, name: 'tabindexedZero' },
        { el: tabindexedNeg, name: 'tabindexedNeg' },
      ];

      for (const { el, name } of elements) {
        const focusSpy = vi.spyOn(el, 'focus');
        expect(host.scroll().scrollTo(el.id, { focus: true, behavior: 'instant' })).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(el);
        if (el === tabindexedZero) {
          expect(el.getAttribute('tabindex')).toBe('0');
        } else if (el === tabindexedNeg) {
          expect(el.getAttribute('tabindex')).toBe('-1');
        } else {
          expect(el.hasAttribute('tabindex'), `Element ${name} should not have tabindex`).toBe(
            false,
          );
        }
      }
    });

    it('assigns temporary tabindex="-1" to non-focusable targets and removes it cleanly on blur', () => {
      const { region, host, render } = setup(null);
      host.source.set([]);
      render();

      const section = region.querySelector<HTMLElement>('#item-1')!;
      const div = document.createElement('div');
      div.id = 'item-div';

      const article = document.createElement('article');
      article.id = 'item-article';

      const heading = document.createElement('h2');
      heading.id = 'item-heading';

      const paragraph = document.createElement('p');
      paragraph.id = 'item-paragraph';

      const anchorNoHref = document.createElement('a');
      anchorNoHref.id = 'item-no-href';

      region.append(div, article, heading, paragraph, anchorNoHref);

      const nonFocusables = [section, div, article, heading, paragraph, anchorNoHref];

      for (const el of nonFocusables) {
        expect(el.hasAttribute('tabindex')).toBe(false);
        expect(host.scroll().scrollTo(el.id, { focus: true, behavior: 'instant' })).toBe(true);
        expect(el.getAttribute('tabindex')).toBe('-1');
        expect(document.activeElement).toBe(el);

        el.dispatchEvent(new Event('blur'));
        expect(el.hasAttribute('tabindex')).toBe(false);
      }
    });

    it('preserves consumer tabindex changes and cleans up when focus cannot be acquired', () => {
      const { region, host, render } = setup(null);
      host.source.set([]);
      render();

      const div = document.createElement('div');
      div.id = 'item-div';
      const disabledButton = document.createElement('button');
      disabledButton.id = 'item-disabled';
      disabledButton.disabled = true;
      const noFocusDiv = document.createElement('div');
      noFocusDiv.id = 'item-nofocus';
      vi.spyOn(noFocusDiv, 'focus').mockImplementation(() => {});
      region.append(div, disabledButton, noFocusDiv);

      host.scroll().scrollTo(div.id, { focus: true, behavior: 'instant' });
      expect(div.getAttribute('tabindex')).toBe('-1');
      div.setAttribute('tabindex', '0');
      div.dispatchEvent(new Event('blur'));
      expect(div.getAttribute('tabindex')).toBe('0');

      host.scroll().scrollTo(disabledButton.id, { focus: true, behavior: 'instant' });
      expect(disabledButton.hasAttribute('tabindex')).toBe(false);

      host.scroll().scrollTo(noFocusDiv.id, { focus: true, behavior: 'instant' });
      expect(noFocusDiv.hasAttribute('tabindex')).toBe(false);
    });

    it('transfers focus even when scrolling is skipped via ignoreWhenInView', () => {
      const { region, host, render, scroll } = setup(null);
      host.source.set([]);
      render();

      const section = region.querySelector<HTMLElement>('#item-1')!;
      scroll.scroll.mockReturnValueOnce(false);

      expect(host.scroll().scrollTo('item-1', { focus: true, ignoreWhenInView: 'top' })).toBe(
        false,
      );
      expect(document.activeElement).toBe(section);
      expect(section.getAttribute('tabindex')).toBe('-1');

      section.dispatchEvent(new Event('blur'));
      expect(section.hasAttribute('tabindex')).toBe(false);
    });

    it('coordinates focus with smooth scroll completion and cancels focus on user intent', () => {
      const { container, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;

      // 1. Smooth scroll completion
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'smooth' })).toBe(true);
      expect(document.activeElement).not.toBe(item1);

      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);

      // 2. Cancellation via wheel
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 20 }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);

      // 3. Cancellation via touchstart
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);

      // 4. Cancellation via touchmove
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new TouchEvent('touchmove', { bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);

      // 5. Cancellation via navigation keydown
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);
    });

    it('cancels pending focus for every newer explicit navigation', () => {
      const { container, region, host, render, scroll } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;

      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      host.scroll().scrollTo(item2.id, { focus: true, behavior: 'instant' });
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item2);

      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      host.scroll().scrollTo(item2.id, { focus: false, behavior: 'instant' });
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      host.scroll().scrollTo('missing-target', { focus: true, behavior: 'instant' });
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      scroll.scroll.mockReturnValueOnce(false);
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      host.scroll().scrollTo(item2.id, { focus: true, behavior: 'smooth' });
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item2);
    });

    it('focuses immediately when smooth scrolling has no movement and resolves auto CSS behavior', () => {
      const { container, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      item1.getBoundingClientRect = () => rect(100);
      expect(host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' })).toBe(true);
      expect(document.activeElement).toBe(item1);
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);

      // Clamping calculation when scrollHeight and viewportHeight are non-zero vs zero
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
      item1.getBoundingClientRect = () => rect(200);
      expect(host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new Event('scrollend'));

      Object.defineProperty(container, 'scrollHeight', { value: 0, configurable: true });
      expect(host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' })).toBe(true);
      container.dispatchEvent(new Event('scrollend'));

      // auto behavior with smooth CSS
      container.style.scrollBehavior = 'smooth';
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'auto' })).toBe(true);
      expect(document.activeElement).toBe(item1);
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(region.querySelector('#item-2'));

      // auto behavior with auto CSS
      container.style.scrollBehavior = 'auto';
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'auto' })).toBe(true);
      expect(document.activeElement).toBe(item1);

      // auto behavior with document scrolling (scrollable is null)
      host.overflow.set('visible');
      render();
      document.documentElement.style.scrollBehavior = 'smooth';
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'auto' })).toBe(true);
      document.dispatchEvent(new Event('scrollend'));

      document.documentElement.style.scrollBehavior = 'auto';
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'auto' })).toBe(true);

      // auto behavior in SSR (null defaultView)
      const doc = TestBed.inject(DOCUMENT);
      const originalView = doc.defaultView;
      Object.defineProperty(doc, 'defaultView', { value: null, configurable: true });
      expect(host.scroll().scrollTo('item-2', { focus: true, behavior: 'auto' })).toBe(true);
      Object.defineProperty(doc, 'defaultView', { value: originalView, configurable: true });
    });

    it('cancels delayed focus when focus moves, the user tabs, or pointer focus changes', () => {
      const { container, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const initiator = document.createElement('button');
      const initiatorChild = document.createElement('span');
      initiator.append(initiatorChild);
      const other = document.createElement('button');
      const pointerTarget = document.createElement('button');
      const outsideEl = document.createElement('div');
      document.body.append(outsideEl);
      region.append(initiator, other, pointerTarget);

      // 1. Tab key cancels scheduled focus
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // 2. Non-Tab key or non-KeyboardEvent does NOT cancel scheduled focus
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      document.dispatchEvent(new Event('keydown'));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);

      // 3. Moving focus to another element cancels scheduled focus
      initiator.focus();
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      // Re-focusing initiator does NOT cancel scheduled focus
      initiator.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      other.focus();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(other);

      // 4. Pointerdown on another element cancels scheduled focus
      initiator.focus();
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      // Pointerdown on initiator or initiator child does NOT cancel
      initiator.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      initiatorChild.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      // Pointerdown with non-Node target does NOT cancel
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      // Pointerdown on another element cancels
      pointerTarget.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      pointerTarget.focus();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(pointerTarget);

      // 5. Navigation keys inside vs outside scrollable context (both cancel scheduled focus)
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      outsideEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // Typing inside an editable element does NOT cancel scheduled focus
      initiator.focus();
      const inputEl = document.createElement('input');
      outsideEl.append(inputEl);
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);

      // Document-level wheel gesture outside container cancels pending focus
      initiator.focus();
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      outsideEl.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 20 }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // Document-level touchstart gesture outside container cancels pending focus
      initiator.focus();
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      outsideEl.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      host.scroll().scrollTo(item2.id, { focus: true, behavior: 'smooth' });
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);

      // 6. Events without pending target are handled safely
      document.dispatchEvent(new CustomEvent('focusin'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      document.dispatchEvent(new Event('pointerdown'));

      outsideEl.remove();
    });

    it('refreshes scroll target before installing focus listeners when container overflow changes dynamically', () => {
      const { region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;

      // Change region overflow to auto so region becomes the scrollable container dynamically
      region.style.overflowY = 'auto';

      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'smooth' })).toBe(true);
      expect(document.activeElement).not.toBe(item1);

      // scrollend dispatched on region (the newly resolved scrollable container) transfers focus
      region.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);
    });

    it('cancels pending focus when external router navigation or fragment clearing supersedes it', () => {
      const { container, region, host, render, routeFragment } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;

      // 1. External router navigation to another fragment cancels scheduled focus
      expect(host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' })).toBe(true);
      routeFragment.next('item-2');
      render();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // 2. External fragment clearing (null) cancels scheduled focus
      expect(host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' })).toBe(true);
      routeFragment.next(null);
      render();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // 3. Internal fragment synchronization preserves scheduled focus
      expect(host.scroll().scrollTo(item2.id, { focus: true, behavior: 'smooth' })).toBe(true);
      render();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item2);
    });

    it('cancels pending focus on document-level scroll intent and cleans up listeners upon completion or cancellation', () => {
      const { container, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const outsideButton = document.createElement('button');
      document.body.append(outsideButton);

      const removeDocSpy = vi.spyOn(document, 'removeEventListener');

      // 1. PageDown outside container cancels pending focus
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      outsideButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // 2. touchmove outside container cancels pending focus
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      outsideButton.dispatchEvent(new TouchEvent('touchmove', { bubbles: true }));
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);

      // 3. Completing focus removes all document-level focus intent listeners
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      removeDocSpy.mockClear();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).toBe(item1);

      expect(removeDocSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
      expect(removeDocSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeDocSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(removeDocSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeDocSpy).toHaveBeenCalledWith('focusin', expect.any(Function));

      outsideButton.remove();
    });

    it('revalidates scheduled targets and bounds focus listeners when scrollend is missing', () => {
      const { container, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      host.scroll().scrollTo(item1.id, { focus: true, behavior: 'smooth' });
      item1.remove();
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item1);
      expect(item1.hasAttribute('tabindex')).toBe(false);

      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      host.scroll().scrollTo(item2.id, { focus: true, behavior: 'smooth' });
      item2.id = 'excluded';
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);
      item2.id = 'item-2';

      vi.useFakeTimers();
      host.scroll().scrollTo(item2.id, { focus: true, behavior: 'smooth' });
      vi.advanceTimersByTime(5000);
      container.dispatchEvent(new Event('scrollend'));
      expect(document.activeElement).not.toBe(item2);
    });

    it('cleans up temporary tabindex attributes and pending focus listeners on directive destruction', () => {
      const { fixture, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'instant' })).toBe(true);
      expect(item1.getAttribute('tabindex')).toBe('-1');

      // Schedule another pending smooth focus
      host.scroll().scrollTo('item-2', { focus: true, behavior: 'smooth' });

      // Destroy directive / fixture
      fixture.destroy();

      expect(item1.hasAttribute('tabindex')).toBe(false);
    });

    it('handles missing targets, non-focus calls, and SSR environments gracefully', () => {
      const { fixture, region, host, render } = setup(null);
      host.source.set([]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;

      // Missing target fails gracefully
      expect(host.scroll().scrollTo('item-missing', { focus: true })).toBe(false);

      // Default focus=false leaves activeElement untouched
      expect(host.scroll().scrollTo('item-1', { focus: false })).toBe(true);
      expect(item1.hasAttribute('tabindex')).toBe(false);

      // Missing focus method (e.g. non-browser environment) fails gracefully
      const originalFocus = item1.focus;
      (item1 as unknown as { focus?: unknown }).focus = undefined;
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'instant' })).toBe(true);
      item1.focus = originalFocus;

      // Null defaultView (SSR) fails gracefully
      const doc = TestBed.inject(DOCUMENT);
      const originalView = doc.defaultView;
      Object.defineProperty(doc, 'defaultView', { value: null, configurable: true });
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'instant' })).toBe(true);
      Object.defineProperty(doc, 'defaultView', { value: originalView, configurable: true });

      // Tabindex already removed before directive destroy (cleanup false branch)
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'instant' })).toBe(true);
      item1.removeAttribute('tabindex');
      fixture.destroy();
    });

    it('handles smooth focus scheduling when target defaults to document', () => {
      const { host } = setup(null);
      (host.scroll() as unknown as { target?: unknown }).target = undefined;
      expect(host.scroll().scrollTo('item-1', { focus: true, behavior: 'smooth' })).toBe(true);
      document.dispatchEvent(new Event('scrollend'));
    });
  });

  describe('preserveOnLayoutChange and region-scoped layout observation', () => {
    it('resolves preserveOnLayoutChange defaults to false and supports hierarchical overrides', () => {
      const defaults = TestBed.inject(MAGIC_SCROLL_OPTIONS);
      expect(defaults.preserveOnLayoutChange).toBe(false);

      const root = Injector.create({ providers: [provideMagicScroll()], parent: Injector.NULL });
      expect(root.get(MAGIC_SCROLL_OPTIONS).preserveOnLayoutChange).toBe(false);

      const parent = Injector.create({
        providers: [provideMagicScroll({ preserveOnLayoutChange: true })],
        parent: root,
      });
      expect(parent.get(MAGIC_SCROLL_OPTIONS).preserveOnLayoutChange).toBe(true);

      const child = Injector.create({
        providers: [provideMagicScroll({ preserveOnLayoutChange: false })],
        parent,
      });
      expect(child.get(MAGIC_SCROLL_OPTIONS).preserveOnLayoutChange).toBe(false);
    });

    it('attaches ResizeObserver to host only when preserveOnLayoutChange is true', () => {
      Observer.instances = [];
      const { fixture, host, region, render } = setup(null);
      host.source.set([]);
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: false });
      render();

      expect(
        Observer.instances.filter((obs) => obs.observe.mock.calls.some(([el]) => el === region))
          .length,
      ).toBe(0);

      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      render();

      const hostObservers = Observer.instances.filter((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      );
      expect(hostObservers.length).toBe(1);
      expect(hostObservers[0].observe).toHaveBeenCalledWith(region);

      fixture.destroy();
      expect(hostObservers[0].disconnect).toHaveBeenCalled();
    });

    it('preserves active anchor relative displacement upon layout change callback via requestAnimationFrame', () => {
      const { host, container, region, render, scroll } = setup('item-2');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 500);
      item1.getBoundingClientRect = () => rect(-500);
      item2.getBoundingClientRect = () => rect(150); // 150 - 100 = 50px displacement
      container.dispatchEvent(new Event('scroll'));
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      expect(hostObserver).toBeDefined();

      expect(hostObserver.observe).toHaveBeenCalledWith(item1);
      expect(hostObserver.observe).toHaveBeenCalledWith(item2);

      let rafCallback: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 42;
      });

      // 1. Initial measurement entry with matching dimensions should be filtered out
      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 30 },
        } as unknown as ResizeObserverEntry,
      ]);
      expect(rafSpy).not.toHaveBeenCalled();

      // 2. Entry for an element not previously recorded initializes without triggering
      const unrecordedEl = document.createElement('div');
      hostObserver.callback([
        {
          target: unrecordedEl,
          contentRect: { width: 50, height: 50 },
        } as unknown as ResizeObserverEntry,
      ]);
      expect(rafSpy).not.toHaveBeenCalled();

      // 3. Entry with changed dimensions triggers layout preservation
      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 80 },
        } as unknown as ResizeObserverEntry,
      ]);
      expect(rafSpy).toHaveBeenCalledTimes(1);

      // 4. Entry without contentRect falling back to getBoundingClientRect
      item1.getBoundingClientRect = () => rect(-500, 120);
      hostObserver.callback([
        {
          target: item1,
        } as unknown as ResizeObserverEntry,
      ]);
      expect(rafSpy).toHaveBeenCalledTimes(1); // Already queued, coalesced

      // 5. Entry on element without getBoundingClientRect
      hostObserver.callback([
        {
          target: {} as Element,
        } as unknown as ResizeObserverEntry,
      ]);

      scroll.scroll.mockClear();
      rafCallback!(performance.now());
      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({
          behavior: 'instant',
          displacement: 50,
        }),
      );
    });

    it('observes anchor reflows and realigns displacement in a fixed-height scroll container with native scroll anchoring disabled', () => {
      const { host, container, region, render, scroll } = setup('item-2');
      container.style.height = '300px';
      container.style.overflowY = 'auto';
      container.style.overflowAnchor = 'none';

      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 300);
      item1.getBoundingClientRect = () => rect(-200, 30);
      item2.getBoundingClientRect = () => rect(180, 30); // 180 - 100 = 80px displacement
      container.dispatchEvent(new Event('scroll'));
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;

      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 99;
      });

      // Item 1 expands inside fixed height container (e.g. accordion open), pushing item2 down
      item1.getBoundingClientRect = () => rect(-200, 150);
      item2.getBoundingClientRect = () => rect(300, 30); // Shifted down

      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 150 },
        } as unknown as ResizeObserverEntry,
      ]);

      scroll.scroll.mockClear();
      rafCallback!(performance.now());

      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({
          behavior: 'instant',
          displacement: 80,
        }),
      );
    });

    it('cancels pending layout correction frame on user scroll gestures and preserves reading position on post-scroll reflow', () => {
      const { host, container, region, render, scroll } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 500);
      item1.getBoundingClientRect = () => rect(100);
      item2.getBoundingClientRect = () => rect(600);

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      // 1. Wheel gesture cancels pending layout correction animation frame
      hostObserver.callback();
      container.dispatchEvent(new Event('wheel'));
      expect(cancelSpy).toHaveBeenCalledWith(expect.any(Number));

      // 2. User scrolls to item-2 and scrolling settles
      item1.getBoundingClientRect = () => rect(-400);
      item2.getBoundingClientRect = () => rect(160); // 160 - 100 = 60px displacement
      container.dispatchEvent(new Event('scroll'));
      render();

      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 55;
      });

      // 3. Post-scroll layout reflow occurs after user stopped scrolling
      item1.getBoundingClientRect = () => rect(-400, 200); // Expanded above
      item2.getBoundingClientRect = () => rect(260); // Pushed down by 100px

      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 200 },
        } as unknown as ResizeObserverEntry,
      ]);

      scroll.scroll.mockClear();
      rafCallback!(performance.now());

      // Should preserve displacement to the newly settled item-2
      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({
          behavior: 'instant',
          displacement: 60,
        }),
      );
    });

    it('preserves reading position on data change even after manual user scrolling', () => {
      const { host, container, region, render, scroll } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], restoreOnDataChange: true });
      host.source.set([1]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 500);
      item1.getBoundingClientRect = () => rect(100);
      item2.getBoundingClientRect = () => rect(600);

      // User scrolls down to item-2 (e.g. wheel event followed by scroll event)
      container.dispatchEvent(new Event('wheel'));
      item1.getBoundingClientRect = () => rect(-400);
      item2.getBoundingClientRect = () => rect(150); // 150 - 100 = 50px displacement
      container.dispatchEvent(new Event('scroll'));
      render();

      scroll.scroll.mockClear();

      // New data prepended/loaded into source
      host.source.set([0, 1, 2]);
      render();

      // restoreOnDataChange should preserve reading position on item-2 with 50px displacement
      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({
          behavior: 'instant',
          displacement: 50,
        }),
      );
    });

    it('cancels pending layout corrections on keyboard navigation', () => {
      const { host, container, region, render } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      hostObserver.callback();
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('cancels pending layout corrections on programmatic scrollTo', () => {
      const { host, region, render } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      hostObserver.callback();
      host.scroll().scrollTo('item-2');
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('cancels pending layout corrections on route fragment updates', () => {
      const { host, region, render, routeFragment } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      hostObserver.callback();
      routeFragment.next('item-2');
      render();
      expect(cancelSpy).toHaveBeenCalled();

      hostObserver.callback();
      routeFragment.next(null);
      render();
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('skips layout preservation when not yet initialized', () => {
      const { host, region, render } = setup(null);
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      // Data source is null (not ready), so directive remains uninitialized
      render();

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      hostObserver.callback();
      expect(rafSpy).not.toHaveBeenCalled();
    });

    it('defers layout preservation during programmatic smooth scrollTo and executes after scrollend', () => {
      const { host, container, region, render, scroll } = setup('item-1');
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([1]);
      render();

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 500);
      item1.getBoundingClientRect = () => rect(100);
      item2.getBoundingClientRect = () => rect(800);

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;

      // Programmatic smooth scroll to item-2
      expect(host.scroll().scrollTo('item-2', { behavior: 'smooth' })).toBe(true);

      // Intermediate scroll event during smooth scrolling should not overwrite liveAnchor
      item1.getBoundingClientRect = () => rect(-200);
      item2.getBoundingClientRect = () => rect(400); // Midway
      container.dispatchEvent(new Event('scroll'));

      // Layout reflow occurs midway during smooth animation
      item1.getBoundingClientRect = () => rect(-200, 150);
      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 150 },
        } as unknown as ResizeObserverEntry,
      ]);

      // Preservation must NOT have executed midway
      expect(scroll.scroll).toHaveBeenLastCalledWith(
        'item-2',
        expect.objectContaining({ behavior: 'smooth' }),
      );

      // Setup RAF spy to capture deferred preservation
      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 77;
      });

      // Smooth scroll finishes and dispatches scrollend
      item1.getBoundingClientRect = () => rect(-700);
      item2.getBoundingClientRect = () => rect(100); // Destination reached
      scroll.scroll.mockClear();
      container.dispatchEvent(new Event('scrollend'));

      // Deferred layout preservation should now be scheduled via RAF
      expect(rafCallback).not.toBeNull();
      rafCallback!(performance.now());

      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({ behavior: 'instant', displacement: 0 }),
      );
    });

    it('defers layout preservation during smooth initial restoration and handles safety timeout', () => {
      vi.useFakeTimers();
      const { host, container, region, render, scroll } = setup('item-2');
      host.options.set({
        anchorPrefixes: ['item-'],
        preserveOnLayoutChange: true,
        behavior: { restoration: 'smooth', interaction: 'instant' },
      });

      const item1 = region.querySelector<HTMLElement>('#item-1')!;
      const item2 = region.querySelector<HTMLElement>('#item-2')!;
      container.getBoundingClientRect = () => rect(100, 500);
      item1.getBoundingClientRect = () => rect(100);
      item2.getBoundingClientRect = () => rect(600);

      // Initial restoration starts smooth scroll
      host.source.set([1]);
      render();

      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({ behavior: 'smooth' }),
      );

      const hostObserver = Observer.instances.find((obs) =>
        obs.observe.mock.calls.some(([el]) => el === region),
      )!;

      // Layout reflow notification arrives during smooth restoration
      hostObserver.callback([
        {
          target: item1,
          contentRect: { width: 100, height: 120 },
        } as unknown as ResizeObserverEntry,
      ]);

      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 88;
      });

      // Safety timeout expires when browser does not emit scrollend
      item1.getBoundingClientRect = () => rect(-500);
      item2.getBoundingClientRect = () => rect(100);
      scroll.scroll.mockClear();
      vi.advanceTimersByTime(3000);

      expect(rafCallback).not.toBeNull();
      rafCallback!(performance.now());
      expect(scroll.scroll).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({ behavior: 'instant' }),
      );
    });

    it('handles smooth navigation completion when no anchors are found or target defaults to document', () => {
      const { host, region, render } = setup(null);
      host.options.set({ anchorPrefixes: ['item-'] });
      host.source.set([]);
      render();

      (host.scroll() as unknown as { target?: unknown }).target = undefined;
      expect(host.scroll().scrollTo('item-1', { behavior: 'smooth' })).toBe(true);
      document.dispatchEvent(new Event('scrollend'));

      // Empty region without matching anchors
      region.innerHTML = '';
      (
        host.scroll() as unknown as {
          beginSmoothNavigation: () => void;
          endSmoothNavigation: () => void;
        }
      ).beginSmoothNavigation();
      (host.scroll() as unknown as { endSmoothNavigation: () => void }).endSmoothNavigation();
    });

    it('handles SSR when ResizeObserver is undefined', () => {
      vi.stubGlobal('ResizeObserver', undefined);
      const { fixture, host, render } = setup(null);
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([]);
      expect(() => render()).not.toThrow();
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('handles SSR when window is undefined', () => {
      const { fixture, host, render } = setup(null);
      const doc = TestBed.inject(DOCUMENT);
      const originalView = doc.defaultView;
      Object.defineProperty(doc, 'defaultView', { value: null, configurable: true });
      host.options.set({ anchorPrefixes: ['item-'], preserveOnLayoutChange: true });
      host.source.set([]);
      expect(() => render()).not.toThrow();
      expect(() => fixture.destroy()).not.toThrow();
      Object.defineProperty(doc, 'defaultView', { value: originalView, configurable: true });
    });
  });
});

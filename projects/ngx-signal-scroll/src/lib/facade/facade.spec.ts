import { Component, Injector, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MagicScrollDirective } from './magic-scroll.directive';
import { ScrollAnchorDirective } from './scroll-anchor.directive';
import {
  MAGIC_SCROLL_OPTIONS,
  MagicScrollOptions,
  provideMagicScroll,
  resolveMagicScrollOptions,
} from './magic-scroll-options';
import { NO_SCROLL_SOURCE, readScrollSource, ScrollSource } from './scroll-source';
import { ScrollService } from '../navigation/scroll-service';

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
  constructor(readonly callback: () => void) {
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
        anchorPrefix: 'parent-',
        headerSelector: '.header',
        headerOffset: 64,
        debounceTime: 1000,
        ignoreWhenInView: 'full',
        behavior: { restoration: 'auto', interaction: 'instant' },
      }),
    ],
    parent: root,
  });
  const child = Injector.create({
    providers: [provideMagicScroll({ anchorPrefix: 'child-' })],
    parent,
  });
  expect(child.get(MAGIC_SCROLL_OPTIONS)).toEqual({
    ...parent.get(MAGIC_SCROLL_OPTIONS),
    anchorPrefix: 'child-',
  });
  expect(
    resolveMagicScrollOptions(child.get(MAGIC_SCROLL_OPTIONS), {
      anchorPrefix: '',
      headerSelector: '',
      headerOffset: 0,
      debounceTime: 0,
      ignoreWhenInView: 'none',
      restoreOnDataChange: false,
      preserveOnResize: false,
      behavior: { restoration: 'smooth' },
    }),
  ).toEqual({
    anchorPrefix: '',
    headerSelector: '',
    headerOffset: 0,
    debounceTime: 0,
    ignoreWhenInView: 'none',
    restoreOnDataChange: false,
    preserveOnResize: false,
    behavior: { restoration: 'smooth', interaction: 'instant' },
  });
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
  readonly options = signal<MagicScrollOptions>({ anchorPrefix: 'item-' });
  readonly overflow = signal('auto');
  readonly explicitId = signal('explicit');
  readonly scroll = viewChild.required(MagicScrollDirective);
}

function setup(fragment: string | null = 'item-1') {
  const routeFragment = new BehaviorSubject(fragment);
  const scroll = { scroll: vi.fn(() => true) };
  const router = { createUrlTree: vi.fn(), navigateByUrl: vi.fn(() => Promise.resolve(true)) };
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
    expect.objectContaining({ behavior: 'instant', ignoreWhenInView: 'top' }),
  );
  host.options.set({ restoreOnDataChange: false });
  render();
  host.source.set([3]);
  render();
  expect(scroll.scroll).toHaveBeenCalledTimes(2);
});

it('supports static resolver content without a source and does not retry a missing initial anchor', () => {
  TestBed.overrideComponent(Host, {
    set: {
      template:
        '<div class="container"><div magicScroll><section id="item-1"></section><section id="item-2"></section></div></div>',
    },
  });
  const { fixture, host, render, scroll } = setup('missing');
  expect(scroll.scroll).not.toHaveBeenCalled();
  const section = document.createElement('section');
  section.id = 'missing';
  fixture.nativeElement.querySelector('[magicScroll]').append(section);
  render();
  expect(scroll.scroll).not.toHaveBeenCalled();
  expect(host.scroll().scrollTo('missing')).toBe(true);
  expect(scroll.scroll).toHaveBeenLastCalledWith(
    'missing',
    expect.objectContaining({ behavior: 'smooth' }),
  );
});

it('combines global, local and per-call options and scopes IDs and explicit anchors', () => {
  TestBed.overrideComponent(Host, {
    add: {
      providers: [provideMagicScroll({ headerOffset: 64, behavior: { interaction: 'auto' } })],
    },
  });
  const { host, region, render, scroll } = setup(null);
  host.source.set([]);
  host.options.set({
    anchorPrefix: 'item-',
    behavior: { interaction: 'instant' },
    headerOffset: 20,
    ignoreWhenInView: 'full',
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

it('debounces scroll spy, reacts to prefix changes and ignores scrolls before readiness', () => {
  vi.useFakeTimers();
  const { host, container, render, routeFragment, router } = setup(null);
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(1000);
  render();
  expect(router.navigateByUrl).not.toHaveBeenCalled();
  host.source.set([1]);
  host.options.set({ anchorPrefix: 'item-', headerOffset: 10, debounceTime: 50 });
  render();
  container.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(49);
  render();
  expect(host.scroll().activeAnchor()).toBeNull();
  vi.advanceTimersByTime(1);
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');
  host.options.set({ anchorPrefix: 'absent-', debounceTime: 0 });
  render();
  // Explicit anchors remain eligible; remove them to exercise no nearest target.
  container
    .querySelectorAll('[data-scroll-anchor]')
    .forEach((el) => el.removeAttribute('data-scroll-anchor'));
  container.dispatchEvent(new Event('scroll'));
  vi.runOnlyPendingTimers();
  render();
  expect(host.scroll().activeAnchor()).toBe('item-1');
  routeFragment.next('external');
  render();
  expect(host.scroll().activeAnchor()).toBe('external');
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

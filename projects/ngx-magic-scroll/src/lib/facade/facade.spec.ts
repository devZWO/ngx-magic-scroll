import { Component, Injector, signal, viewChild } from '@angular/core';
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
      bottomOffset: 0,
      activationThreshold: 0,
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
    bottomOffset: 0,
    activationThreshold: 0,
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
  host.options.set({ anchorPrefix: 'item-', bottomOffset: 20, debounceTime: 50 });
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
  host.options.set({ anchorPrefix: 'item-', activationThreshold: 0.7, debounceTime: 50 });
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
  host.options.set({ anchorPrefix: 'item-', debounceTime: 500 });
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
    expect.objectContaining({ behavior: 'instant', ignoreWhenInView: 'top' }),
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

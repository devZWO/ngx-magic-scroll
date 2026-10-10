import { Component, InjectionToken, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  QueryClient,
  injectInfiniteQuery,
  injectQuery,
  provideTanStackQuery,
} from '@tanstack/angular-query-experimental';
import { BehaviorSubject, Subject } from 'rxjs';
import { MagicScrollDirective } from './magic-scroll.directive';
import { ScrollDataSource, ScrollSource } from '../../public-api';
import { ScrollService } from '../navigation/scroll-service';

interface Item {
  id: number;
}
const SOURCE = new InjectionToken<ScrollSource>('Recipe data source');
const ITEMS = new InjectionToken<() => Item[]>('Rendered recipe items');

@Component({
  imports: [MagicScrollDirective],
  template: `<div magicScroll [scrollSource]="source">
    @for (item of items(); track item.id) {
      <section [id]="'item-' + item.id"></section>
    }
  </div>`,
})
class RecipeHost {
  readonly source = inject(SOURCE);
  readonly items = inject(ITEMS);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup<T extends { source: ScrollSource; items: () => Item[] }>(
  createSource: () => T,
  initialAnchor = 'item-2',
) {
  const fragment = new BehaviorSubject(initialAnchor);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const scroll = vi.fn(() => true);
  TestBed.configureTestingModule({
    imports: [RecipeHost],
    providers: [
      provideTanStackQuery(client),
      { provide: ScrollService, useValue: { scroll } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: initialAnchor }, fragment } },
      {
        provide: Router,
        useValue: { createUrlTree: vi.fn(), navigateByUrl: vi.fn(async () => true) },
      },
      { provide: SOURCE, useFactory: () => source.source },
      { provide: ITEMS, useFactory: () => source.items },
    ],
  });
  const source = TestBed.runInInjectionContext(createSource);
  const fixture = TestBed.createComponent(RecipeHost);
  // Assert the target DOM exists at the moment restoration is requested.
  scroll.mockImplementation((...args: unknown[]) => {
    expect(fixture.nativeElement.querySelector('#' + args[0])).not.toBeNull();
    return true;
  });
  const render = () => {
    fixture.detectChanges();
    TestBed.tick();
  };
  const settle = async () => {
    await fixture.whenStable();
    render();
  };
  render();
  return { ...source, fixture, scroll, fragment, render, settle, client };
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
});

describe('recipe integration: real Angular rxResource', () => {
  it('waits for loading and rendered anchors, then preserves the current fragment on updates', async () => {
    const first = new Subject<Item[]>();
    const next = new Subject<Item[]>();
    let requests = 0;
    const test = setup(() => {
      const resource = rxResource({ stream: () => (++requests === 1 ? first : next) });
      return {
        resource,
        source: resource,
        items: () => (resource.hasValue() ? resource.value() : []),
      };
    });
    expect(test.resource.isLoading()).toBe(true);
    expect(test.scroll).not.toHaveBeenCalled();
    first.next([{ id: 1 }, { id: 2 }]);
    first.complete();
    await test.settle();
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
    test.render();
    expect(test.scroll).toHaveBeenCalledOnce();

    test.fragment.next('item-1');
    test.resource.reload();
    test.render();
    expect(test.scroll).toHaveBeenCalledOnce();
    next.next([{ id: 0 }, { id: 1 }, { id: 2 }]);
    next.complete();
    await test.settle();
    expect(test.scroll).toHaveBeenLastCalledWith(
      'item-1',
      expect.objectContaining({ behavior: 'instant', ignoreWhenInView: 'top' }),
    );
  });

  it('does not consume initial restoration on an error and can restore after retry', async () => {
    const failed = new Subject<Item[]>();
    const retry = new Subject<Item[]>();
    let requests = 0;
    const test = setup(() => {
      const resource = rxResource({ stream: () => (++requests === 1 ? failed : retry) });
      return {
        resource,
        source: resource,
        items: () => (resource.hasValue() ? resource.value() : []),
      };
    });
    failed.error(new Error('Offline'));
    await test.settle();
    expect(test.resource.error()).toBeDefined();
    expect(test.scroll).not.toHaveBeenCalled();
    test.resource.reload();
    test.render();
    retry.next([{ id: 2 }]);
    retry.complete();
    await test.settle();
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
  });

  it('treats an empty success as ready and does not retry the initial target on later updates', async () => {
    const first = new Subject<Item[]>();
    const next = new Subject<Item[]>();
    let requests = 0;
    const test = setup(() => {
      const resource = rxResource({ stream: () => (++requests === 1 ? first : next) });
      return {
        resource,
        source: resource,
        items: () => (resource.hasValue() ? resource.value() : []),
      };
    });
    first.next([]);
    first.complete();
    await test.settle();
    expect(test.resource.hasValue()).toBe(true);
    expect(test.scroll).not.toHaveBeenCalled();
    test.resource.reload();
    test.render();
    next.next([{ id: 2 }]);
    next.complete();
    await test.settle();
    // A later update is a current-anchor correction, not initial restoration.
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith(
      'item-2',
      expect.objectContaining({ ignoreWhenInView: 'top' }),
    );
  });
});

const ProjectsStore = signalStore(
  withState({ projects: [] as Item[], loading: false, loaded: false }),
  withMethods((store) => ({
    begin(projects: Item[]) {
      patchState(store, { projects, loading: true });
    },
    fail() {
      patchState(store, { loading: false });
    },
    complete(projects: Item[]) {
      patchState(store, { projects, loaded: true, loading: false });
    },
  })),
);

describe('recipe integration: real NgRx Signal Store', () => {
  it('gates an idle empty store until successful loading and tracks both data and loading signals', () => {
    const test = setup(() => {
      const store = new ProjectsStore();
      const source: ScrollDataSource = {
        data: () => (store.loaded() ? store.projects() : undefined),
        isLoading: () => store.loading(),
      };
      return { store, source, items: () => store.projects() };
    });
    expect(test.scroll).not.toHaveBeenCalled();
    test.store.begin([{ id: 2 }]);
    test.render();
    expect(test.scroll).not.toHaveBeenCalled();
    test.store.fail();
    test.render();
    expect(test.scroll).not.toHaveBeenCalled();
    test.store.complete([{ id: 2 }]);
    test.render();
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
    test.fragment.next('item-1');
    test.store.complete([{ id: 1 }, { id: 2 }]);
    test.render();
    expect(test.scroll).toHaveBeenLastCalledWith(
      'item-1',
      expect.objectContaining({ ignoreWhenInView: 'top' }),
    );
  });
});

async function querySettled(
  test: {
    query: { status: () => string; fetchStatus: () => string };
    render: () => void;
    settle: () => Promise<void>;
  },
  status = 'success',
) {
  // TanStack batches observer notifications; Angular stability alone can precede that batch.
  await vi.waitFor(() => {
    test.render();
    expect(test.query.status()).toBe(status);
    expect(test.query.fetchStatus()).toBe('idle');
  });
  await test.settle();
}

describe('recipe integration: real TanStack Query', () => {
  it('waits on a disabled query without data and restores when it is enabled and resolved', async () => {
    const request = deferred<Item[]>();
    const test = setup(() => {
      const enabled = signal(false);
      const query = injectQuery(() => ({
        queryKey: ['projects'],
        enabled: enabled(),
        queryFn: () => request.promise,
      }));
      return { query, enabled, source: query, items: () => query.data() ?? [] };
    });
    expect(test.query.isLoading()).toBe(false);
    expect(test.scroll).not.toHaveBeenCalled();
    test.enabled.set(true);
    test.render();
    expect(test.scroll).not.toHaveBeenCalled();
    request.resolve([{ id: 1 }, { id: 2 }]);
    await querySettled(test);
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
    test.client.clear();
  });

  it('retains initial restoration through an error and restores after a successful refetch', async () => {
    const failed = deferred<Item[]>();
    const retry = deferred<Item[]>();
    let requests = 0;
    const test = setup(() => {
      const query = injectQuery(() => ({
        queryKey: ['projects'],
        queryFn: () => (++requests === 1 ? failed.promise : retry.promise),
      }));
      return { query, source: query, items: () => query.data() ?? [] };
    });
    failed.reject(new Error('Offline'));
    await querySettled(test, 'error');
    expect(test.query.isError()).toBe(true);
    expect(test.scroll).not.toHaveBeenCalled();
    const refetch = test.query.refetch();
    retry.resolve([{ id: 2 }]);
    await refetch;
    await querySettled(test);
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
    test.client.clear();
  });

  it('restores cached data immediately and keeps it rendered during a background refetch', async () => {
    const request = deferred<Item[]>();
    const test = setup(() => {
      inject(QueryClient).setQueryData(['projects'], [{ id: 1 }, { id: 2 }]);
      const query = injectQuery(() => ({
        queryKey: ['projects'],
        queryFn: () => request.promise,
        staleTime: Infinity,
      }));
      return { query, source: query, items: () => query.data() ?? [] };
    });
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-2', expect.anything());
    test.fragment.next('item-1');
    const refetch = test.query.refetch();
    test.render();
    await vi.waitFor(() => expect(test.query.isFetching()).toBe(true));
    expect(test.query.isLoading()).toBe(false);
    expect(test.fixture.nativeElement.querySelector('#item-1')).not.toBeNull();
    request.resolve([{ id: 0 }, { id: 1 }, { id: 2 }]);
    await refetch;
    await querySettled(test);
    expect(test.scroll).toHaveBeenLastCalledWith(
      'item-1',
      expect.objectContaining({ ignoreWhenInView: 'top' }),
    );
    test.client.clear();
  });

  it('loads the saved initial range before restoring and appends subsequent Infinite Query pages', async () => {
    const initial = deferred<Item[]>();
    const next = deferred<Item[]>();
    const fetchPage = vi.fn((offset: number, limit: number) => {
      expect(limit).toBeGreaterThan(0);
      return offset === 0 ? initial.promise : next.promise;
    });
    const test = setup(() => {
      const initialCount = 16;
      const query = injectInfiniteQuery(() => ({
        queryKey: ['projects', 'infinite', initialCount],
        initialPageParam: 0,
        queryFn: ({ pageParam }) => fetchPage(pageParam, pageParam === 0 ? initialCount : 8),
        getNextPageParam: (last, pages) => (last.length ? pages.flat().length : undefined),
      }));
      return { query, source: query, items: () => query.data()?.pages.flat() ?? [] };
    }, 'item-12');
    expect(fetchPage).toHaveBeenCalledWith(0, 16);
    expect(test.scroll).not.toHaveBeenCalled();
    initial.resolve(Array.from({ length: 16 }, (_, index) => ({ id: index + 1 })));
    await querySettled(test);
    expect(test.scroll).toHaveBeenCalledExactlyOnceWith('item-12', expect.anything());
    expect(test.fixture.nativeElement.querySelectorAll('section')).toHaveLength(16);
    const loading = test.query.fetchNextPage();
    await vi.waitFor(() => expect(test.query.isFetchingNextPage()).toBe(true));
    expect(fetchPage).toHaveBeenLastCalledWith(16, 8);
    next.resolve([{ id: 17 }]);
    await loading;
    await querySettled(test);
    expect(test.fixture.nativeElement.querySelector('#item-17')).not.toBeNull();
    test.client.clear();
  });
});

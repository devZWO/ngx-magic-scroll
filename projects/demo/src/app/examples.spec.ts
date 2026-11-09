import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { DetailExample, DocumentExample, DrawerExample, NavigationExample } from './examples';
import { leaveDelayGuard } from './leave-delay.guard';
import { SlowLazyExample } from './slow-lazy-example';

@Component({ template: '<h1>Target</h1>' })
class LeaveDelayTarget {}

describe('Demo Examples', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
  });
  afterEach(() => vi.useRealTimers());
  it('instantiates and operates DocumentExample', async () => {
    TestBed.configureTestingModule({
      imports: [DocumentExample],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(DocumentExample);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.options()).toBeDefined();
    expect(fixture.nativeElement.querySelector('a[href="/slow-lazy"]')?.textContent).toContain(
      'Open delayed lazy page',
    );

    comp.strategy.set('prefix');
    expect(comp.options().anchorPrefixes).toEqual(['kapitel-']);
    comp.strategy.set('explicit');
    expect(comp.options().anchorSelection).toBe('explicit');
    comp.strategy.set('all');
    expect(comp.options().anchorPrefixes).toEqual(['']);
    comp.strategy.set('multi-prefix');
    expect(comp.options().anchorPrefixes).toEqual(['kapitel-', 'anhang-']);

    comp.jump('kapitel-1');
    expect(comp.result()).toContain('Scrolling');

    comp.focusTransfer.set(true);
    comp.jump('kapitel-2');
    expect(comp.result()).toBe('Scrolling initiated; focus transfer requested.');

    comp.jumpWithFocus('kapitel-3');
    expect(comp.result()).toBe('Scrolling initiated; focus transfer requested.');
    comp.strategy.set('prefix');
    comp.jumpWithFocus('anhang-detail');
    expect(comp.result()).toBe(
      'Scrolling was not initiated; focus transfer was requested if the target is eligible.',
    );
  });

  it('instantiates and operates DrawerExample', async () => {
    TestBed.configureTestingModule({
      imports: [DrawerExample],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: of(null),
            snapshot: {
              fragment: null,
              queryParamMap: convertToParamMap({ count: '10' }),
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(DrawerExample);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.options().restoreOnDataChange).toBe(true);
    expect(comp.addThree(2)).toBe(5);

    comp.showOverlay.set(true);
    fixture.detectChanges();
    expect(comp.drawerContentElement()).toBeDefined();

    comp.prepend.set(3);
    comp.loadMore();
    expect(comp.count()).toBe(14);

    comp.jump(1);
    comp.focusTransfer.set(true);
    comp.jump(2);
  });

  it('instantiates and operates NavigationExample and DetailExample', async () => {
    TestBed.configureTestingModule({
      imports: [NavigationExample, DetailExample],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: of(null),
            snapshot: {
              fragment: null,
              queryParamMap: convertToParamMap({
                scroll: 'auto',
                offset: '40',
                delay: '1',
                leaveDelay: '450',
                result: 'empty',
              }),
              paramMap: convertToParamMap({ id: '42' }),
              routeConfig: { path: 'navigation/detail/:id' },
            },
          },
        },
      ],
    });

    const navFixture = TestBed.createComponent(NavigationExample);
    navFixture.detectChanges();
    await navFixture.whenStable();

    const navComp = navFixture.componentInstance;
    expect(navComp.behavior()).toBe('auto');
    expect(navComp.offset()).toBe(40);
    expect(navComp.leaveDelay()).toBe(450);
    navComp.showOverlay.set(true);
    navComp.setOptions('instant', 60);
    expect(navComp.behavior()).toBe('instant');
    expect(navComp.offset()).toBe(60);
    const leaveDelayInput = navFixture.nativeElement.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    leaveDelayInput.value = '900';
    leaveDelayInput.dispatchEvent(new Event('input'));
    expect(navComp.leaveDelay()).toBe(900);
    expect(navComp.entries()).toEqual([]);

    // Error result branch
    navComp.loadResult.set('error');
    navComp.resource.reload();
    navFixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    navFixture.detectChanges();
    expect(navComp.resource.error()).toBeDefined();

    const detailFixture = TestBed.createComponent(DetailExample);
    detailFixture.detectChanges();
    await detailFixture.whenStable();

    const detailComp = detailFixture.componentInstance;
    expect(detailComp.id).toBe('42');
    expect(detailComp.listPath).toBe('/navigation');
    expect(detailComp.prefix).toBe('eintrag-');
  });

  it('renders the delayed lazy route page', () => {
    TestBed.configureTestingModule({ imports: [SlowLazyExample], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SlowLazyExample);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'Slow lazy page loaded',
    );
  });

  it('holds a route change until the configured leave delay expires', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'navigation', component: NavigationExample, canDeactivate: [leaveDelayGuard] },
          { path: 'target', component: LeaveDelayTarget },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/navigation?leaveDelay=50', NavigationExample);
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/target');

    await vi.advanceTimersByTimeAsync(49);
    expect(router.url).toContain('/navigation');
    await vi.advanceTimersByTimeAsync(1);

    expect(await navigation).toBe(true);
    expect(router.url).toBe('/target');

    await router.navigateByUrl('/navigation?leaveDelay=0');
    expect(await router.navigateByUrl('/target')).toBe(true);
  });

  it('handles default navigation query params', async () => {
    TestBed.configureTestingModule({
      imports: [NavigationExample],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: of(null),
            snapshot: {
              fragment: null,
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(NavigationExample);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.behavior()).toBe('instant');
    expect(comp.offset()).toBe(0);
  });
});

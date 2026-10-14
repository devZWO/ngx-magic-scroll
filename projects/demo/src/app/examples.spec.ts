import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DetailExample, DocumentExample, DrawerExample, NavigationExample } from './examples';

describe('Demo Examples', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
  });
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
    navComp.showOverlay.set(true);
    navComp.setOptions('instant', 60);
    expect(navComp.behavior()).toBe('instant');
    expect(navComp.offset()).toBe(60);
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

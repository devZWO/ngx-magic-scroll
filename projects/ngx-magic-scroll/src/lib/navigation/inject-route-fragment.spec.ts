import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { injectRouteFragment } from './inject-route-fragment';

it('initializes from the snapshot, follows changes and unsubscribes on destruction', () => {
  const changes = new Subject<string | null>();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { fragment: 'initial' }, fragment: changes },
      },
    ],
  });
  const fragment = TestBed.runInInjectionContext(injectRouteFragment);
  expect(fragment()).toBe('initial');
  changes.next('updated');
  expect(fragment()).toBe('updated');
  changes.next(null);
  expect(fragment()).toBeNull();
  TestBed.resetTestingModule();
  expect(changes.observed).toBe(false);
  changes.next('after-destroy');
  expect(fragment()).toBeNull();
});

it('supports an absent initial fragment', () => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { fragment: null }, fragment: new Subject() },
      },
    ],
  });
  expect(TestBed.runInInjectionContext(injectRouteFragment)()).toBeNull();
});

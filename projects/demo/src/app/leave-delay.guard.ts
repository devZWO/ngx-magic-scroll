import { CanDeactivateFn } from '@angular/router';
import { map, of, timer } from 'rxjs';
import { NavigationExample } from './examples';

export const leaveDelayGuard: CanDeactivateFn<NavigationExample> = (component) => {
  const delay = component.leaveDelay();
  return delay === 0 ? of(true) : timer(delay).pipe(map(() => true));
};

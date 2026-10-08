import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { effectSkipFirstIf } from './effect-skip-first-if';

it('skips the first successful condition and stops after destruction', () => {
  const value = signal(0);
  const action = vi.fn();
  const ref = TestBed.runInInjectionContext(() => effectSkipFirstIf(() => value() > 0, action));
  TestBed.tick();
  expect(action).not.toHaveBeenCalled();
  value.set(1);
  TestBed.tick();
  expect(action).not.toHaveBeenCalled();
  value.set(2);
  TestBed.tick();
  expect(action).toHaveBeenCalledTimes(1);
  ref.destroy();
  value.set(3);
  TestBed.tick();
  expect(action).toHaveBeenCalledTimes(1);
});

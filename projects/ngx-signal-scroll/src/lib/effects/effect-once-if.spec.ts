import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { effectOnceIf } from './effect-once-if';

it('waits for the predicate and runs only once, without tracking the action', () => {
  const ready = signal(false);
  const unrelated = signal(0);
  const predicate = vi.fn(() => ready());
  const action = vi.fn(() => unrelated());
  effectOnceIf(predicate, action, { injector: TestBed.inject(Injector) });
  TestBed.tick();
  expect(action).not.toHaveBeenCalled();
  ready.set(true);
  TestBed.tick();
  expect(action).toHaveBeenCalledTimes(1);
  const evaluations = predicate.mock.calls.length;
  unrelated.set(1);
  ready.set(false);
  TestBed.tick();
  ready.set(true);
  TestBed.tick();
  expect(predicate).toHaveBeenCalledTimes(evaluations);
  expect(action).toHaveBeenCalledTimes(1);
});

it('runs for an initially satisfied predicate', () => {
  const action = vi.fn();
  effectOnceIf(() => true, action, { injector: TestBed.inject(Injector) });
  TestBed.tick();
  TestBed.tick();
  expect(action).toHaveBeenCalledTimes(1);
});

it('stops waiting when its injection context is destroyed', () => {
  const ready = signal(false);
  const action = vi.fn();
  effectOnceIf(() => ready(), action, { injector: TestBed.inject(Injector) });
  TestBed.tick();
  TestBed.resetTestingModule();
  ready.set(true);
  TestBed.tick();
  expect(action).not.toHaveBeenCalled();
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class CancelledRoute {}

it('offers the four examples and renders header mascot', async () => {
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([{ path: 'cancelled', canActivate: [() => false], component: CancelledRoute }]),
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(4);
  expect(fixture.nativeElement.querySelector('output[aria-live="polite"]')?.textContent).toBe('0');
  const mascotImg = fixture.nativeElement.querySelector('.brand img');
  expect(mascotImg).not.toBeNull();
  expect(mascotImg?.getAttribute('src')).toContain('ngx-magic-scroll-maskotchen_128x128.ico');

  expect(await TestBed.inject(Router).navigateByUrl('/cancelled')).toBe(false);
  fixture.detectChanges();
  expect(
    fixture.nativeElement.querySelector('output[aria-label="Aborted navigation count"]')
      ?.textContent,
  ).toBe('1');
});

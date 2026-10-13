import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

it('offers the four examples and renders header mascot', async () => {
  TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(4);
  const mascotImg = fixture.nativeElement.querySelector('.brand img');
  expect(mascotImg).not.toBeNull();
  expect(mascotImg?.getAttribute('src')).toContain('ngx-magic-scroll-maskotchen_128x128.ico');
});

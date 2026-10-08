import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
it('offers the four examples', async () => {
  TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(4);
});

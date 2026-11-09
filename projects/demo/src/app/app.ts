import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationCancel, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  imports: [RouterLink, RouterOutlet, NgOptimizedImage],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly abortedNavigationCount = signal(0);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationCancel),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.abortedNavigationCount.update((count) => count + 1));
  }
}

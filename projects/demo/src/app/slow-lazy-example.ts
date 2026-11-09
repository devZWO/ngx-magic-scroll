import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `<h1>Slow lazy page loaded</h1>
    <p>This route is intentionally delayed before its component is loaded.</p>
    <a routerLink="/document">Back to document</a>`,
})
export class SlowLazyExample {}

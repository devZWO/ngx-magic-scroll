import { Component, input, model } from '@angular/core';
import { MagicScrollOptions } from '@devzwo/ngx-magic-scroll';
export type VisibilityMode = NonNullable<MagicScrollOptions['ignoreWhenInView']>;

@Component({
  selector: 'app-scroll-options',
  template: `<details class="demo-options">
    <summary>Options</summary>
    <fieldset>
      <legend>Scroll settings</legend>
      <label
        >Scroll behavior
        <select #behaviorInput [value]="behavior()" (change)="setBehavior(behaviorInput.value)">
          <option value="instant">Instant</option>
          <option value="smooth">Smooth Scrolling</option>
          <option value="auto">Browser default</option>
        </select></label
      >
      <label
        >Top offset
        <select #offsetInput [value]="offset()" (change)="offset.set(+offsetInput.value)">
          <option value="0">0 px</option>
          <option value="20">20 px</option>
          <option value="64">64 px</option>
        </select></label
      >
      @if (showVisibility()) {
        <label
          >Skip scrolling
          <select
            #visibilityInput
            [value]="visibility()"
            (change)="setVisibility(visibilityInput.value)"
          >
            <option value="none">Never</option>
            <option value="top">When the top edge is visible</option>
            <option value="full">When the whole target is visible</option>
            <option value="always">When either target edge is visible</option>
          </select></label
        >
      }
      @if (showSpy()) {
        <label
          >Scroll-spy delay
          <select
            #debounceInput
            [value]="debounceTime()"
            (change)="debounceTime.set(+debounceInput.value)"
          >
            <option value="0">0 ms</option>
            <option value="150">150 ms</option>
            <option value="500">500 ms</option>
            <option value="1000">1000 ms</option>
          </select></label
        >
        <label
          ><input
            type="checkbox"
            [checked]="onlyPrefixed()"
            (change)="onlyPrefixed.set(!onlyPrefixed())"
          />Only consider chapter anchors</label
        >
      }
    </fieldset>
  </details>`,
})
export class ScrollOptionsPanel {
  readonly behavior = model<ScrollBehavior>('instant');
  readonly offset = model(0);
  readonly visibility = model<VisibilityMode>('none');
  readonly debounceTime = model(500);
  readonly onlyPrefixed = model(true);
  readonly showVisibility = input(false);
  readonly showSpy = input(false);
  setBehavior(value: string) {
    if (value === 'instant' || value === 'smooth' || value === 'auto') this.behavior.set(value);
  }
  setVisibility(value: string) {
    if (value === 'none' || value === 'top' || value === 'full' || value === 'always')
      this.visibility.set(value);
  }
}

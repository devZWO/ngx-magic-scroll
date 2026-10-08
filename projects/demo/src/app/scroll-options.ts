import { Component, input, model } from '@angular/core';
import { ScrollOptions } from '@devzwo/ngx-magic-scroll';
export type VisibilityMode = NonNullable<ScrollOptions['ignoreWhenInView']>;

@Component({
  selector: 'app-scroll-options',
  template: `<details class="demo-options">
    <summary>Optionen</summary>
    <fieldset>
      <legend>Scroll-Einstellungen</legend>
      <label
        >Scroll-Verhalten
        <select #behaviorInput [value]="behavior()" (change)="setBehavior(behaviorInput.value)">
          <option value="instant">Sofort</option>
          <option value="smooth">Smooth Scrolling</option>
          <option value="auto">Browser-Vorgabe</option>
        </select></label
      >
      <label
        >Oberer Abstand
        <select #offsetInput [value]="offset()" (change)="offset.set(+offsetInput.value)">
          <option value="0">0 px</option>
          <option value="20">20 px</option>
          <option value="64">64 px</option>
        </select></label
      >
      @if (showVisibility()) {
        <label
          >Scrollen überspringen
          <select
            #visibilityInput
            [value]="visibility()"
            (change)="setVisibility(visibilityInput.value)"
          >
            <option value="none">Nie</option>
            <option value="top">Wenn die Oberkante sichtbar ist</option>
            <option value="full">Wenn das gesamte Ziel sichtbar ist</option>
            <option value="always">Wenn eine Zielkante sichtbar ist</option>
          </select></label
        >
      }
      @if (showSpy()) {
        <label
          >Scroll-Spy-Verzögerung
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
          />Nur Kapitel-Anker berücksichtigen</label
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

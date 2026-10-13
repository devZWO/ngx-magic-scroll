import { Component, input, model } from '@angular/core';
import { MagicScrollOptions } from '@devzwo/ngx-magic-scroll';
export type VisibilityMode = NonNullable<MagicScrollOptions['ignoreWhenInView']>;
export type AnchorStrategyOption = 'prefix' | 'multi-prefix' | 'explicit' | 'all';

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
          <option value="16">16 px</option>
          <option value="20">20 px</option>
          <option value="64">64 px</option>
        </select></label
      >
      <label
        >Bottom offset
        <select
          #bottomOffsetInput
          [value]="bottomOffset()"
          (change)="bottomOffset.set(+bottomOffsetInput.value)"
        >
          <option value="0">0 px</option>
          <option value="20">20 px</option>
          <option value="48">48 px</option>
          <option value="80">80 px</option>
        </select></label
      >
      <label
        >Activation threshold
        <select
          #thresholdInput
          [value]="activationThreshold()"
          (change)="activationThreshold.set(+thresholdInput.value)"
        >
          <option value="0">0% (Top / Header)</option>
          <option value="0.25">25% (Upper quarter)</option>
          <option value="0.33">33% (Upper third)</option>
          <option value="0.5">50% (Center)</option>
          <option value="0.75">75% (Lower quarter)</option>
        </select></label
      >
      @if (showOverlayToggle()) {
        <label
          ><input type="checkbox" [checked]="overlay()" (change)="overlay.set(!overlay())" />Show
          active zone overlay</label
        >
      }
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
          >Anchor selection
          <select
            #strategyInput
            [value]="strategy()"
            (change)="setStrategy(strategyInput.value)"
          >
            <option value="prefix">Single prefix (kapitel-)</option>
            <option value="multi-prefix">Multiple prefixes (kapitel-, anhang-)</option>
            <option value="explicit">Explicit markers only (scrollAnchor)</option>
            <option value="all">All descendant IDs</option>
          </select></label
        >
        <label
          ><input
            type="checkbox"
            [checked]="onlyPrefixed()"
            (change)="toggleOnlyPrefixed()"
          />Only consider chapter anchors</label
        >
      }
    </fieldset>
  </details>`,
})
export class ScrollOptionsPanel {
  readonly behavior = model<ScrollBehavior>('instant');
  readonly offset = model(0);
  readonly bottomOffset = model(0);
  readonly activationThreshold = model(0);
  readonly overlay = model(false);
  readonly visibility = model<VisibilityMode>('none');
  readonly debounceTime = model(500);
  readonly onlyPrefixed = model(true);
  readonly strategy = model<AnchorStrategyOption>('prefix');
  readonly showVisibility = input(false);
  readonly showSpy = input(false);
  readonly showOverlayToggle = input(true);
  setBehavior(value: string) {
    if (value === 'instant' || value === 'smooth' || value === 'auto') this.behavior.set(value);
  }
  setVisibility(value: string) {
    if (value === 'none' || value === 'top' || value === 'full' || value === 'always')
      this.visibility.set(value);
  }
  setStrategy(value: string) {
    if (
      value === 'prefix' ||
      value === 'multi-prefix' ||
      value === 'explicit' ||
      value === 'all'
    ) {
      this.strategy.set(value);
      this.onlyPrefixed.set(value !== 'all');
    }
  }
  toggleOnlyPrefixed() {
    const next = !this.onlyPrefixed();
    this.onlyPrefixed.set(next);
    this.strategy.set(next ? 'prefix' : 'all');
  }
}

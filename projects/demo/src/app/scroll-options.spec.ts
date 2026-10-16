import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { AnchorStrategyOption, ScrollOptionsPanel, VisibilityMode } from './scroll-options';

@Component({
  imports: [ScrollOptionsPanel],
  template: `
    <app-scroll-options
      [(behavior)]="behavior"
      [(offset)]="offset"
      [(bottomOffset)]="bottomOffset"
      [(activationThreshold)]="activationThreshold"
      [(overlay)]="overlay"
      [(visibility)]="visibility"
      [(debounceTime)]="debounceTime"
      [(onlyPrefixed)]="onlyPrefixed"
      [(strategy)]="strategy"
      [(focus)]="focus"
      [(preserveOnLayoutChange)]="preserveOnLayoutChange"
      [showVisibility]="showVisibility()"
      [showSpy]="showSpy()"
      [showStrategy]="showStrategy()"
      [showFocusToggle]="showFocusToggle()"
      [showOverlayToggle]="showOverlayToggle()"
      [showPreserveOnLayoutChange]="showPreserveOnLayoutChange()"
    />
  `,
})
class TestHost {
  readonly behavior = signal<ScrollBehavior>('instant');
  readonly offset = signal(0);
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly overlay = signal(false);
  readonly visibility = signal<VisibilityMode>('none');
  readonly debounceTime = signal(500);
  readonly onlyPrefixed = signal(true);
  readonly strategy = signal<AnchorStrategyOption>('prefix');
  readonly focus = signal(false);
  readonly preserveOnLayoutChange = signal(false);

  readonly showVisibility = signal(false);
  readonly showSpy = signal(false);
  readonly showStrategy = signal(false);
  readonly showFocusToggle = signal(false);
  readonly showOverlayToggle = signal(true);
  readonly showPreserveOnLayoutChange = signal(false);
}

describe('ScrollOptionsPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, ScrollOptionsPanel],
    }).compileComponents();
  });

  function createHost(): { fixture: ComponentFixture<TestHost>; host: TestHost } {
    const fixture = TestBed.createComponent(TestHost);
    const host = fixture.componentInstance;
    return { fixture, host };
  }

  function createDirect(): {
    fixture: ComponentFixture<ScrollOptionsPanel>;
    component: ScrollOptionsPanel;
  } {
    const fixture = TestBed.createComponent(ScrollOptionsPanel);
    const component = fixture.componentInstance;
    return { fixture, component };
  }

  describe('direct component logic', () => {
    it('initializes with default model and input values', () => {
      const { component } = createDirect();
      expect(component.behavior()).toBe('instant');
      expect(component.offset()).toBe(0);
      expect(component.bottomOffset()).toBe(0);
      expect(component.activationThreshold()).toBe(0);
      expect(component.overlay()).toBe(false);
      expect(component.visibility()).toBe('none');
      expect(component.debounceTime()).toBe(500);
      expect(component.onlyPrefixed()).toBe(true);
      expect(component.strategy()).toBe('prefix');
      expect(component.focus()).toBe(false);
      expect(component.preserveOnLayoutChange()).toBe(false);
      expect(component.showVisibility()).toBe(false);
      expect(component.showSpy()).toBe(false);
      expect(component.showStrategy()).toBe(false);
      expect(component.showFocusToggle()).toBe(false);
      expect(component.showOverlayToggle()).toBe(true);
      expect(component.showPreserveOnLayoutChange()).toBe(false);
    });

    it('updates behavior only for valid options in setBehavior', () => {
      const { component } = createDirect();

      component.setBehavior('smooth');
      expect(component.behavior()).toBe('smooth');

      component.setBehavior('auto');
      expect(component.behavior()).toBe('auto');

      component.setBehavior('instant');
      expect(component.behavior()).toBe('instant');

      component.setBehavior('invalid-behavior');
      expect(component.behavior()).toBe('instant');
    });

    it('updates visibility only for valid options in setVisibility', () => {
      const { component } = createDirect();

      component.setVisibility('top');
      expect(component.visibility()).toBe('top');

      component.setVisibility('full');
      expect(component.visibility()).toBe('full');

      component.setVisibility('always');
      expect(component.visibility()).toBe('always');

      component.setVisibility('none');
      expect(component.visibility()).toBe('none');

      component.setVisibility('invalid-visibility');
      expect(component.visibility()).toBe('none');
    });

    it('updates strategy and onlyPrefixed in setStrategy', () => {
      const { component } = createDirect();

      component.setStrategy('multi-prefix');
      expect(component.strategy()).toBe('multi-prefix');
      expect(component.onlyPrefixed()).toBe(true);

      component.setStrategy('explicit');
      expect(component.strategy()).toBe('explicit');
      expect(component.onlyPrefixed()).toBe(true);

      component.setStrategy('all');
      expect(component.strategy()).toBe('all');
      expect(component.onlyPrefixed()).toBe(false);

      component.setStrategy('prefix');
      expect(component.strategy()).toBe('prefix');
      expect(component.onlyPrefixed()).toBe(true);

      component.setStrategy('unknown-strategy');
      expect(component.strategy()).toBe('prefix');
      expect(component.onlyPrefixed()).toBe(true);
    });

    it('toggles onlyPrefixed and aligns strategy with toggleOnlyPrefixed', () => {
      const { component } = createDirect();
      expect(component.onlyPrefixed()).toBe(true);
      expect(component.strategy()).toBe('prefix');

      component.toggleOnlyPrefixed();
      expect(component.onlyPrefixed()).toBe(false);
      expect(component.strategy()).toBe('all');

      component.toggleOnlyPrefixed();
      expect(component.onlyPrefixed()).toBe(true);
      expect(component.strategy()).toBe('prefix');
    });
  });

  describe('template rendering and DOM events', () => {
    it('renders basic controls and toggles overlay', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const selects = compiled.querySelectorAll('select');
      expect(selects.length).toBe(4); // behavior, offset, bottomOffset, threshold

      const overlayCheckbox = compiled.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement | null;
      expect(overlayCheckbox).not.toBeNull();
      expect(overlayCheckbox?.checked).toBe(false);

      overlayCheckbox?.click();
      fixture.detectChanges();
      expect(host.overlay()).toBe(true);
    });

    it('hides overlay toggle when showOverlayToggle is false', () => {
      const { fixture, host } = createHost();
      host.showOverlayToggle.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const overlayCheckbox = compiled.querySelector('input[type="checkbox"]');
      expect(overlayCheckbox).toBeNull();
    });

    it('updates behavior, offsets, and activation threshold on select change', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const selects = compiled.querySelectorAll('select');
      const behaviorSelect = selects[0] as HTMLSelectElement;
      const offsetSelect = selects[1] as HTMLSelectElement;
      const bottomOffsetSelect = selects[2] as HTMLSelectElement;
      const thresholdSelect = selects[3] as HTMLSelectElement;

      behaviorSelect.value = 'smooth';
      behaviorSelect.dispatchEvent(new Event('change'));
      expect(host.behavior()).toBe('smooth');

      offsetSelect.value = '20';
      offsetSelect.dispatchEvent(new Event('change'));
      expect(host.offset()).toBe(20);

      bottomOffsetSelect.value = '48';
      bottomOffsetSelect.dispatchEvent(new Event('change'));
      expect(host.bottomOffset()).toBe(48);

      thresholdSelect.value = '0.5';
      thresholdSelect.dispatchEvent(new Event('change'));
      expect(host.activationThreshold()).toBe(0.5);
    });

    it('conditionally renders and binds visibility select', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Skip scrolling');

      host.showVisibility.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Skip scrolling');

      const visibilitySelect = compiled.querySelector(
        '#scroll-opt-visibility',
      ) as HTMLSelectElement | null;
      expect(visibilitySelect).not.toBeNull();

      visibilitySelect!.value = 'full';
      visibilitySelect!.dispatchEvent(new Event('change'));
      expect(host.visibility()).toBe('full');
    });

    it('conditionally renders and binds spy delay independently from strategy controls', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Scroll-spy delay');
      expect(compiled.textContent).not.toContain('Anchor selection');
      expect(compiled.textContent).not.toContain('Only consider chapter anchors');

      host.showSpy.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Scroll-spy delay');
      expect(compiled.textContent).not.toContain('Anchor selection');
      expect(compiled.textContent).not.toContain('Only consider chapter anchors');

      const debounceSelect = compiled.querySelector(
        '#scroll-opt-debounce',
      ) as HTMLSelectElement | null;
      expect(debounceSelect).not.toBeNull();

      debounceSelect!.value = '150';
      debounceSelect!.dispatchEvent(new Event('change'));
      expect(host.debounceTime()).toBe(150);
    });

    it('conditionally renders and binds anchor strategy and chapter filter controls', () => {
      const { fixture, host } = createHost();
      host.showStrategy.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Scroll-spy delay');
      expect(compiled.textContent).toContain('Anchor selection');
      expect(compiled.textContent).toContain('Only consider chapter anchors');

      const strategySelect = compiled.querySelector(
        '#scroll-opt-strategy',
      ) as HTMLSelectElement | null;
      expect(strategySelect).not.toBeNull();

      strategySelect!.value = 'multi-prefix';
      strategySelect!.dispatchEvent(new Event('change'));
      expect(host.strategy()).toBe('multi-prefix');
      expect(host.onlyPrefixed()).toBe(true);

      const chapterInput = compiled.querySelector(
        '#scroll-opt-only-prefixed',
      ) as HTMLInputElement | null;
      expect(chapterInput).not.toBeNull();
      expect(chapterInput!.checked).toBe(true);

      chapterInput!.click();
      fixture.detectChanges();
      expect(host.onlyPrefixed()).toBe(false);
      expect(host.strategy()).toBe('all');
    });

    it('conditionally renders and binds focus toggle', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Transfer focus to target');

      host.showFocusToggle.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Transfer focus to target');

      const focusInput = compiled.querySelector('#scroll-opt-focus') as HTMLInputElement | null;
      expect(focusInput).not.toBeNull();
      expect(focusInput!.checked).toBe(false);

      focusInput!.click();
      fixture.detectChanges();
      expect(host.focus()).toBe(true);
    });

    it('conditionally renders and binds preserveOnLayoutChange toggle', () => {
      const { fixture, host } = createHost();
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Preserve position on layout change');

      host.showPreserveOnLayoutChange.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Preserve position on layout change');

      const layoutChangeInput = compiled.querySelector(
        '#scroll-opt-layout-change',
      ) as HTMLInputElement | null;
      expect(layoutChangeInput).not.toBeNull();
      expect(layoutChangeInput!.checked).toBe(false);

      layoutChangeInput!.click();
      fixture.detectChanges();
      expect(host.preserveOnLayoutChange()).toBe(true);
    });

    it('renders parameter help buttons for all configurable fields', () => {
      const { fixture, host } = createHost();
      host.showVisibility.set(true);
      host.showSpy.set(true);
      host.showStrategy.set(true);
      host.showFocusToggle.set(true);
      host.showPreserveOnLayoutChange.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const helpElements = Array.from(compiled.querySelectorAll('app-param-help'));
      expect(helpElements.length).toBe(10);
    });
  });
});

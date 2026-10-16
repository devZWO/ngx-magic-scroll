import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ParamHelpButton } from './param-help';
import { PARAM_HELP_INFO } from './param-help.data';

@Component({
  imports: [ParamHelpButton],
  template: `<app-param-help [paramId]="paramId()" />`,
})
class TestHost {
  readonly paramId = signal('behavior');
}

describe('ParamHelpButton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, ParamHelpButton],
      providers: [provideAnimationsAsync('noop')],
    }).compileComponents();
  });

  function createHost(paramId = 'behavior'): {
    fixture: ComponentFixture<TestHost>;
    host: TestHost;
  } {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.paramId.set(paramId);
    fixture.detectChanges();
    return { fixture, host: fixture.componentInstance };
  }

  describe('metadata registry', () => {
    it('contains all expected parameter entries with non-empty fields', () => {
      const expectedIds = [
        'behavior',
        'headerOffset',
        'bottomOffset',
        'activationThreshold',
        'overlay',
        'ignoreWhenInView',
        'debounceTime',
        'anchorSelection',
        'restoreOnDataChange',
        'preserveOnLayoutChange',
      ];

      for (const id of expectedIds) {
        const entry = PARAM_HELP_INFO[id];
        expect(entry).toBeDefined();
        expect(entry.id).toBe(id);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.summary.length).toBeGreaterThan(0);
        expect(entry.impact.length).toBeGreaterThan(0);
        expect(entry.scopes.length).toBeGreaterThan(0);
      }
    });

    it('has valid doc link URLs pointing to the documentation site', () => {
      for (const entry of Object.values(PARAM_HELP_INFO)) {
        for (const link of entry.docLinks) {
          expect(link.label.length).toBeGreaterThan(0);
          expect(link.url).toMatch(/^https:\/\/devzwo\.github\.io\/ngx-magic-scroll\//);
        }
      }
    });
  });

  describe('component logic and aria attributes', () => {
    it('computes ariaLabel based on paramId', () => {
      const { fixture, host } = createHost('headerOffset');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button') as HTMLButtonElement;

      expect(button.getAttribute('aria-label')).toBe('Help for headerOffset');

      host.paramId.set('debounceTime');
      fixture.detectChanges();
      expect(button.getAttribute('aria-label')).toBe('Help for debounceTime');
    });

    it('handles unknown parameter ids gracefully', () => {
      const { fixture } = createHost('nonExistentParam');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button') as HTMLButtonElement;

      expect(button.getAttribute('aria-label')).toBe('Help for nonExistentParam');
    });
  });

  describe('template rendering and popover interaction', () => {
    it('renders the trigger button with question mark SVG icon', () => {
      const { fixture } = createHost('behavior');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.param-help-btn');
      const svg = button?.querySelector('svg.help-icon');

      expect(button).not.toBeNull();
      expect(svg).not.toBeNull();
    });

    it('opens the popover menu on click and displays parameter details', () => {
      const { fixture } = createHost('behavior');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.param-help-btn') as HTMLButtonElement;

      button.click();
      fixture.detectChanges();

      const overlay = document.querySelector('.param-help-popover') as HTMLElement | null;
      expect(overlay).not.toBeNull();

      expect(overlay?.querySelector('.popover-title')?.textContent).toContain('Scroll Behavior');
      expect(overlay?.querySelector('.property-badge')?.textContent).toContain('behavior');
      expect(overlay?.querySelector('.popover-summary')?.textContent).toContain(
        'Controls whether scrolling to anchors',
      );
      expect(overlay?.querySelector('.impact-text')?.textContent).toContain(
        "'instant' prevents disorienting jumps",
      );

      const scopePills = Array.from(overlay?.querySelectorAll('.scope-pill') ?? []);
      const scopes = scopePills.map((p) => p.textContent?.trim());
      expect(scopes).toEqual(['provideMagicScroll', '[scrollOptions]', 'scrollTo']);

      const docLinks = Array.from(
        overlay?.querySelectorAll('.doc-link') ?? [],
      ) as HTMLAnchorElement[];
      expect(docLinks.length).toBe(2);
      expect(docLinks[0].href).toBe(
        'https://devzwo.github.io/ngx-magic-scroll/concepts/url-state-and-navigation/',
      );
      expect(docLinks[0].target).toBe('_blank');
      expect(docLinks[0].rel).toBe('noopener noreferrer');
    });

    it('renders popover without property key badge for overlay', () => {
      const { fixture } = createHost('overlay');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.param-help-btn') as HTMLButtonElement;

      button.click();
      fixture.detectChanges();

      const overlay = document.querySelector('.param-help-popover') as HTMLElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay?.querySelector('.popover-title')?.textContent).toContain(
        'Active Zone Overlay',
      );
      expect(overlay?.querySelector('.property-badge')).toBeNull();
    });

    it('renders popover without documentation section when docLinks is empty', () => {
      PARAM_HELP_INFO['noDocParam'] = {
        id: 'noDocParam',
        title: 'No Docs Parameter',
        summary: 'A parameter without external documentation links.',
        impact: 'No behavioral impact.',
        scopes: ['demo'],
        docLinks: [],
      };

      const { fixture } = createHost('noDocParam');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.param-help-btn') as HTMLButtonElement;

      button.click();
      fixture.detectChanges();

      const overlay = document.querySelector('.param-help-popover') as HTMLElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay?.querySelector('.docs-block')).toBeNull();

      delete PARAM_HELP_INFO['noDocParam'];
    });

    it('renders fallback notice when parameter id is unknown', () => {
      const { fixture } = createHost('unknownParam');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.param-help-btn') as HTMLButtonElement;

      button.click();
      fixture.detectChanges();

      const overlay = document.querySelector('.param-help-popover') as HTMLElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay?.querySelector('.missing-info')?.textContent).toContain(
        "No description available for 'unknownParam'",
      );
    });
  });
});

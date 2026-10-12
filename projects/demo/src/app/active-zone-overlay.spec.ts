import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveZoneOverlay } from './active-zone-overlay';
import { Component, signal } from '@angular/core';

@Component({
  imports: [ActiveZoneOverlay],
  template: `
    <app-active-zone-overlay
      [headerOffset]="offset()"
      [bottomOffset]="bottomOffset()"
      [activationThreshold]="activationThreshold()"
      [headerSelector]="headerSelector()"
    />
  `,
})
class TestHost {
  readonly offset = signal(0);
  readonly bottomOffset = signal(0);
  readonly activationThreshold = signal(0);
  readonly headerSelector = signal('');
}

describe('ActiveZoneOverlay', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders trigger line and computes thresholds correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const triggerBadge = compiled.querySelector('[data-testid="trigger-line-badge"]');
    expect(triggerBadge?.textContent).toContain('Trigger Line (0%)');

    host.activationThreshold.set(0.5);
    fixture.detectChanges();
    expect(triggerBadge?.textContent).toContain('Trigger Line (50%)');
  });

  it('renders top and bottom exclusion zones when offsets are set', () => {
    host.offset.set(40);
    host.bottomOffset.set(60);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const topZone = compiled.querySelector('[data-testid="top-exclusion-zone"]');
    const bottomZone = compiled.querySelector('[data-testid="bottom-exclusion-zone"]');

    expect(topZone).not.toBeNull();
    expect(bottomZone).not.toBeNull();
    expect(topZone?.textContent).toContain('Top Exclusion (40px)');
    expect(bottomZone?.textContent).toContain('Bottom Exclusion (60px)');
  });
});

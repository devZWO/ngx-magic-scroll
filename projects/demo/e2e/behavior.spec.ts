import { expect } from '@playwright/test';
import { test, aligned, atOffset, placeAnchor } from './fixtures';

for (const { behavior, cssSmooth } of [
  { behavior: 'smooth', cssSmooth: false },
  { behavior: 'instant', cssSmooth: true },
  { behavior: 'auto', cssSmooth: false },
  { behavior: 'auto', cssSmooth: true },
]) {
  test(`document ${behavior} scrolling (CSS smooth: ${cssSmooth}) has the expected animation and keeps the page stationary`, async ({
    page,
  }) => {
    await page.goto('/document');
    await page.getByText('Options', { exact: true }).click();
    await page.getByLabel('Scroll behavior').selectOption(behavior);
    await page.getByLabel('Top offset').selectOption('20');
    await page.getByText('Options', { exact: true }).click();
    await page.locator('.viewport').evaluate((el, smooth) => {
      el.style.scrollBehavior = smooth ? 'smooth' : 'auto';
    }, cssSmooth);
    // Keep the navigation and the viewport visible so Playwright need not scroll the page.
    await page.evaluate(() => window.scrollTo(0, 0));
    const outerPosition = await page.evaluate(() => window.scrollY);
    await page.locator('.viewport').evaluate((el) => {
      const samples: number[] = [];
      el.addEventListener('scroll', () => {
        samples.push(el.scrollTop);
        el.setAttribute('data-scroll-samples', JSON.stringify(samples));
      });
    });
    await page.getByRole('button', { name: 'kapitel-4', exact: true }).click();
    await atOffset(page, '#kapitel-4', '.viewport', 20);
    await expect(page).toHaveURL(/#kapitel-4$/);
    const target = await page.locator('.viewport').evaluate((el) => el.scrollTop);
    const samples: number[] = JSON.parse(
      (await page.locator('.viewport').getAttribute('data-scroll-samples')) ?? '[]',
    );
    const intermediate = samples.filter((value) => value > 2 && value < target - 2);
    if (behavior === 'smooth' || (behavior === 'auto' && cssSmooth))
      expect(intermediate.length).toBeGreaterThan(1);
    else expect(intermediate).toEqual([]);
    expect(await page.evaluate(() => window.scrollY)).toBe(outerPosition);
  });
}

test('visibility modes distinguish full visibility, each visible edge, hidden and oversized targets', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  const target = page.locator('#kapitel-3');
  const scenarios = [
    { name: 'fully visible', top: 100, height: 280, skipped: ['top', 'full', 'always'] },
    { name: 'only top visible', top: 350, height: 280, skipped: ['top', 'always'] },
    { name: 'only bottom visible', top: -100, height: 280, skipped: ['always'] },
    { name: 'below viewport', top: 500, height: 280, skipped: [] },
    { name: 'above viewport', top: -350, height: 280, skipped: [] },
    { name: 'both edges outside viewport', top: -50, height: 600, skipped: [] },
  ];
  for (const scenario of scenarios) {
    for (const mode of ['none', 'top', 'full', 'always']) {
      await test.step(`${scenario.name}, mode ${mode}`, async () => {
        await page.getByLabel('Skip scrolling').selectOption(mode);
        await target.evaluate(
          (el, height) => (el.style.minHeight = `${height}px`),
          scenario.height,
        );
        await placeAnchor(page, '#kapitel-3', '.viewport', scenario.top);
        const before = await page.locator('.viewport').evaluate((el) => el.scrollTop);
        await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
        if (scenario.skipped.includes(mode)) {
          await expect(page.getByRole('status', { name: 'Scroll result' })).toContainText(
            'skipped',
          );
          expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(before);
        } else {
          await expect(page.getByRole('status', { name: 'Scroll result' })).toHaveText(
            'Scrolling initiated.',
          );
          await aligned(page, '#kapitel-3', '.viewport');
          expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).not.toBe(before);
        }
      });
    }
  }
});

test('scroll spy debounces a burst, uses the final anchor and reacts to a changed delay', async ({
  page,
}) => {
  await page.goto('/document?keep=yes');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('1000');
  await page.clock.install();
  const history = await page.evaluate(() => window.history.length);
  await placeAnchor(page, '#kapitel-3', '.viewport', 0);
  await page.clock.runFor(400);
  await expect(page.locator('output')).toHaveText('');
  await placeAnchor(page, '#kapitel-4', '.viewport', 0);
  await page.clock.runFor(500);
  await expect(page.locator('output')).toHaveText('');
  await page.clock.runFor(550);
  await expect(page).toHaveURL(/keep=yes#kapitel-4$/);
  await expect(page.locator('output')).toHaveText('kapitel-4');
  await page.getByLabel('Scroll-spy delay').selectOption('0');
  await placeAnchor(page, '#kapitel-2', '.viewport', 0);
  await page.clock.runFor(50);
  await expect(page).toHaveURL(/keep=yes#kapitel-2$/);
  expect(await page.evaluate(() => window.history.length)).toBe(history);
});

test('prefix filtering excludes a closer intermediate anchor and can be disabled at runtime', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('0');
  await placeAnchor(page, '#zwischen-kapitel-3', '.viewport', 0);
  await expect(page).toHaveURL(/#kapitel-4$/);
  await page.getByLabel('Only consider chapter anchors').uncheck();
  await expect(page).toHaveURL(/#zwischen-kapitel-3$/);
});

test('anchor selection strategy options switch between prefixes and explicit-only mode while excluding generated Material IDs', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('0');

  // Verify Angular Material input is rendered with an ID
  const matInput = page.locator('.demo-material-form input');
  await expect(matInput).toBeVisible();
  const matId = await matInput.getAttribute('id');
  expect(matId).toBeTruthy();

  // Positioning the generated input must not discover matId as anchor in prefix mode; an eligible section is selected instead
  await placeAnchor(page, `#${matId}`, '.viewport', 0);
  await expect(page).toHaveURL(/#kapitel-3$/);
  await expect(page.locator('output')).toHaveText('kapitel-3');

  // In default single prefix mode: explicit marker spezial-notiz is eligible
  await page.getByRole('button', { name: 'spezial-notiz', exact: true }).click();
  await aligned(page, '#spezial-notiz', '.viewport');
  await expect(page).toHaveURL(/#spezial-notiz$/);

  // Switch to multi-prefix mode: anhang-detail is now eligible
  await page.getByLabel('Anchor selection').selectOption('multi-prefix');
  await page.getByRole('button', { name: 'anhang-detail', exact: true }).click();
  await aligned(page, '#anhang-detail', '.viewport');
  await expect(page).toHaveURL(/#anhang-detail$/);

  // Switch to explicit-only mode: only explicit scrollAnchor markers are eligible (kapitel-4 is ignored)
  await page.getByLabel('Anchor selection').selectOption('explicit');
  await page.getByRole('button', { name: 'kapitel-4', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Scroll result' })).toContainText(
    'Scrolling skipped',
  );

  // Positioning the generated input in explicit mode must not select matId; the only explicit marker spezial-notiz is selected
  await placeAnchor(page, `#${matId}`, '.viewport', 0);
  await expect(page).toHaveURL(/#spezial-notiz$/);
  await expect(page.locator('output')).toHaveText('spezial-notiz');

  // Explicit target works in explicit mode
  await page.getByRole('button', { name: 'spezial-notiz', exact: true }).click();
  await aligned(page, '#spezial-notiz', '.viewport');
  await expect(page).toHaveURL(/#spezial-notiz$/);
});

test('wheel and keyboard scroll the document container and synchronize its anchor', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('0');
  await page.locator('.viewport').hover();
  const outerPosition = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 280);
  await expect
    .poll(() => page.locator('.viewport').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(200);
  await expect(page).toHaveURL(/#kapitel-2$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(outerPosition);
  // Explicit focus makes keyboard ownership unambiguous across browser engines.
  await page.locator('.viewport').evaluate((el) => {
    el.setAttribute('tabindex', '0');
    (el as HTMLElement).focus({ preventScroll: true });
  });
  await page.keyboard.press('Home');
  await expect.poll(() => page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(0);
  await expect(page).toHaveURL(/#kapitel-1$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(outerPosition);
});

test('drawer scroll spy responds to wheel input independently of navigation buttons', async ({
  page,
}) => {
  await page.goto('/drawer#antrag-card-4');
  await aligned(page, '#antrag-card-4', 'mat-drawer-content');
  await page.locator('mat-drawer-content').hover();
  const outerPosition = await page.evaluate(() => window.scrollY);
  const drawerPosition = await page.locator('mat-drawer').evaluate((el) => el.scrollTop);
  await page.mouse.wheel(0, 280);
  await expect
    .poll(() => page.locator('mat-drawer-content').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(1000);
  await expect(page).toHaveURL(/#antrag-card-5$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(outerPosition);
  expect(await page.locator('mat-drawer').evaluate((el) => el.scrollTop)).toBe(drawerPosition);
});

test('navigation options changed through the UI preserve query parameters and history', async ({
  page,
}) => {
  await page.goto('/navigation?keep=yes#eintrag-4');
  await aligned(page, '#eintrag-4', '.viewport');
  const history = await page.evaluate(() => window.history.length);
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll behavior').selectOption('smooth');
  await page.getByLabel('Top offset').selectOption('64');
  await expect.poll(() => new URL(page.url()).searchParams.get('offset')).toBe('64');
  expect(new URL(page.url()).searchParams.get('scroll')).toBe('smooth');
  expect(new URL(page.url()).searchParams.get('keep')).toBe('yes');
  expect(new URL(page.url()).hash).toBe('#eintrag-4');
  expect(await page.evaluate(() => window.history.length)).toBe(history);
  await page.getByRole('link', { name: 'Details for 4', exact: true }).click();
  await page.getByRole('link', { name: 'Back to list', exact: true }).click();
  await atOffset(page, '#eintrag-4', '.viewport', 64);
  await page.reload();
  await atOffset(page, '#eintrag-4', '.viewport', 64);
});

test('initial restoration waits for loading and does not repeat after a later reload', async ({
  page,
}) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await expect(page.locator('#eintrag-4')).not.toBeAttached();
  expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(0);
  await aligned(page, '#eintrag-4', '.viewport');
  await placeAnchor(page, '#eintrag-6', '.viewport', 0);
  await expect(page).toHaveURL(/#eintrag-6$/);
  await page.getByText('Loading behavior', { exact: true }).click();
  await page.getByLabel('Loading delay (ms)').fill('300');
  await page.getByRole('button', { name: 'Reload list' }).click();
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await expect(page.getByRole('status')).toBeHidden();
  await aligned(page, '#eintrag-6', '.viewport');
  await expect(page).toHaveURL(/#eintrag-6$/);
});

test('leaving a pending load prevents stale scrolling and URL updates', async ({ page }) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  // Retain the old DOM node to dispatch events after its directive has been destroyed.
  const oldViewport = await page.locator('.viewport').elementHandle();
  await page
    .getByRole('navigation', { name: 'Examples' })
    .getByRole('link', { name: 'Document', exact: true })
    .click();
  await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
  await aligned(page, '#kapitel-3', '.viewport');
  await expect(page).toHaveURL(/\/document#kapitel-3$/);
  await oldViewport!.evaluate((el) => el.dispatchEvent(new Event('scroll')));
  await page.clock.install();
  await page.clock.runFor(2000);
  await aligned(page, '#kapitel-3', '.viewport');
  await expect(page).toHaveURL(/\/document#kapitel-3$/);
  await expect(page.locator('#eintrag-4')).not.toBeAttached();
  await oldViewport!.dispose();
});

for (const fragment of ['', '#nicht-vorhanden']) {
  test(`navigation handles ${fragment ? 'unknown' : 'missing'} fragments without a scroll or URL rewrite`, async ({
    page,
  }) => {
    await page.goto(`/navigation?keep=yes${fragment}`);
    await expect(page.locator('#eintrag-8')).toBeAttached();
    await page.clock.install();
    await page.clock.runFor(1000);
    expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(0);
    expect(new URL(page.url()).hash).toBe(fragment);
    expect(new URL(page.url()).searchParams.get('keep')).toBe('yes');
  });
}

test('an empty loaded list leaves the scroll position and requested fragment untouched', async ({
  page,
}) => {
  await page.goto('/navigation?result=empty#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('No entries.');
  await expect(page.locator('.viewport section')).toHaveCount(0);
  await page.clock.install();
  await page.clock.runFor(1000);
  expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(0);
  await expect(page).toHaveURL(/#eintrag-4$/);
});

test('a failed initial load can be retried and then restores the requested anchor', async ({
  page,
}) => {
  await page.goto('/navigation?result=error#eintrag-4');
  await expect(page.getByRole('alert')).toContainText('Please try again');
  expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByText('Loading behavior', { exact: true }).click();
  await page.getByLabel('Loading result').selectOption('data');
  await page.getByRole('button', { name: 'Reload list' }).click();
  await aligned(page, '#eintrag-4', '.viewport');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page).toHaveURL(/#eintrag-4$/);
});

test('first and last anchors respect the scroll limits without fragment oscillation', async ({
  page,
}) => {
  await page.goto('/document?keep=yes');
  await page.getByRole('button', { name: 'kapitel-1', exact: true }).click();
  // Container borders account for one pixel; use the same strict tolerance as alignment checks.
  expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBeLessThan(2);
  await page.getByRole('button', { name: 'kapitel-5', exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator('.viewport')
        .evaluate((el) => Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight))),
    )
    .toBeLessThan(2);
  await expect(page).toHaveURL(/keep=yes#kapitel-5$/);
  const history = await page.evaluate(() => window.history.length);
  await page.clock.install();
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/keep=yes#kapitel-5$/);
  expect(await page.evaluate(() => window.history.length)).toBe(history);
});

test('wheel scrolling the master-detail page updates the active project without moving the master', async ({
  page,
}) => {
  await page.goto('/master-detail#projekt-8');
  await expect
    .poll(() =>
      page
        .locator('#projekt-8')
        .evaluate((el) =>
          Math.abs(
            el.getBoundingClientRect().top -
              document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom -
              16,
          ),
        ),
    )
    .toBeLessThan(3);
  await page.locator('#projekt-8').hover();
  const masterPosition = await page.locator('.portfolio-master').evaluate((el) => el.scrollTop);
  const documentPosition = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 220);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(documentPosition + 100);
  await expect(page).toHaveURL(/#projekt-8$/);
  await expect(page.getByRole('button', { name: 'Project 8', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(await page.locator('.portfolio-master').evaluate((el) => el.scrollTop)).toBe(
    masterPosition,
  );
  await page.mouse.wheel(0, 300);
  await expect(page).toHaveURL(/#projekt-9$/);
  await expect(page.getByRole('button', { name: 'Project 9', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('reading within a section taller than the viewport keeps that section active when its heading leaves view and only changes when the next section crosses the activation boundary', async ({
  page,
}) => {
  await page.goto('/master-detail#projekt-2');

  await expect
    .poll(() =>
      page
        .locator('#projekt-2')
        .evaluate((el) =>
          Math.abs(
            el.getBoundingClientRect().top -
              document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom -
              16,
          ),
        ),
    )
    .toBeLessThan(3);
  await expect(page.getByRole('button', { name: 'Project 2', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page).toHaveURL(/#projekt-2$/);

  // Scroll 200px into Project 2 (each section has min-height 440px)
  await page.locator('#projekt-2').hover();
  await page.mouse.wheel(0, 200);

  // Project 2 heading is now above the header, Project 3 heading is still below the header
  await expect
    .poll(() =>
      page
        .locator('#projekt-2')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().top <
            document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom,
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator('#projekt-3')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().top >
            document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom + 50,
        ),
    )
    .toBe(true);

  // Active anchor and URL MUST remain project-2
  await expect(page).toHaveURL(/#projekt-2$/);
  await expect(page.getByRole('button', { name: 'Project 2', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Project 3', exact: true })).not.toHaveAttribute(
    'aria-current',
    'true',
  );

  // Now scroll further down so Project 3 heading crosses the header threshold
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() =>
      page
        .locator('#projekt-3')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().top <=
            document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom + 16,
        ),
    )
    .toBe(true);

  // Now Project 3 becomes active
  await expect(page).toHaveURL(/#projekt-3$/);
  await expect(page.getByRole('button', { name: 'Project 3', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );

  // Scroll back up into Project 2
  await page.mouse.wheel(0, -300);
  await expect(page).toHaveURL(/#projekt-2$/);
  await expect(page.getByRole('button', { name: 'Project 2', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('container scrolling activates fully visible sections and retains active reading state when tall', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('0');

  // Place kapitel-2 inside viewport so it is fully visible below the top edge
  await placeAnchor(page, '#kapitel-2', '.viewport', 40);

  // kapitel-2 is fully contained within the visible container area
  await expect(page).toHaveURL(/#kapitel-2$/);
  await expect(page.locator('output')).toHaveText('kapitel-2');

  // When sections inside the container are tall (taller than container height), reading fallback keeps section active
  await page.locator('#kapitel-2').evaluate((el) => {
    (el as HTMLElement).style.minHeight = '600px';
  });
  await placeAnchor(page, '#kapitel-2', '.viewport', -100);

  // kapitel-2 heading is scrolled past container top, but kapitel-3 is still below container bottom
  await expect(page).toHaveURL(/#kapitel-2$/);
  await expect(page.locator('output')).toHaveText('kapitel-2');
});

test('live activation threshold adjustment changes section trigger point', async ({ page }) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();
  await page.getByLabel('Scroll-spy delay').selectOption('0');

  // Place kapitel-2 at top -200 (scrolled past top) and kapitel-3 at top 250
  // Container height is 480px.
  // With threshold 0% (trigger line = 0px), kapitel-3 (top 250 > 0) is below trigger line, so kapitel-2 is active
  await page.locator('#kapitel-2').evaluate((el) => {
    (el as HTMLElement).style.minHeight = '450px';
  });
  await placeAnchor(page, '#kapitel-2', '.viewport', -200);
  await expect(page).toHaveURL(/#kapitel-2$/);
  await expect(page.locator('output')).toHaveText('kapitel-2');

  // Now change activation threshold live to 75% (0.75 * 480 = 360px)
  // Since kapitel-3 top (250px) is <= 360px trigger line, kapitel-3 becomes active immediately
  await page.getByLabel('Activation threshold').selectOption('0.75');
  await page.locator('.viewport').dispatchEvent('scroll');

  await expect(page).toHaveURL(/#kapitel-3$/);
  await expect(page.locator('output')).toHaveText('kapitel-3');
});

test('toggling active zone overlay renders exclusion zones and dynamic trigger badge', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Options', { exact: true }).click();

  // Overlay is initially hidden
  await expect(page.locator('.active-zone-overlay')).toBeHidden();

  // Toggle overlay on
  await page.getByLabel('Show active zone overlay').check();
  await expect(page.locator('.active-zone-overlay')).toBeVisible();
  await expect(page.locator('[data-testid="reading-area-zone"]')).toBeVisible();
  await expect(page.locator('[data-testid="trigger-line"]')).toBeVisible();
  await expect(page.locator('[data-testid="trigger-line-badge"]')).toHaveText('Trigger Line (0%)');

  // Adjust offsets and threshold
  await page.getByLabel('Top offset').selectOption('20');
  await page.getByLabel('Bottom offset').selectOption('48');
  await page.getByLabel('Activation threshold').selectOption('0.5');

  await expect(page.locator('[data-testid="top-exclusion-zone"]')).toContainText(
    'Top Exclusion (20px)',
  );
  await expect(page.locator('[data-testid="bottom-exclusion-zone"]')).toContainText(
    'Bottom Exclusion (48px)',
  );
  await expect(page.locator('[data-testid="trigger-line-badge"]')).toHaveText('Trigger Line (50%)');

  // Navigation buttons still work through the non-blocking overlay
  await page.getByRole('button', { name: 'kapitel-4', exact: true }).click();
  await expect(page).toHaveURL(/#kapitel-4$/);

  // Toggle overlay off
  await page.getByLabel('Show active zone overlay').uncheck();
  await expect(page.locator('.active-zone-overlay')).toBeHidden();
});

test('master-detail supports live active zone overlay and dynamic header offset updates', async ({
  page,
}) => {
  await page.goto('/master-detail');
  await page.getByText('Options', { exact: true }).click();

  await page.getByLabel('Show active zone overlay').check();
  await expect(page.locator('.active-zone-overlay')).toBeVisible();
  await expect(page.locator('[data-testid="top-exclusion-zone"]')).toBeVisible();

  // Expanding header dynamically increases measured header height and top exclusion zone
  const initialTopHeight = await page
    .locator('[data-testid="top-exclusion-zone"]')
    .evaluate((el) => el.getBoundingClientRect().height);

  await page.getByRole('button', { name: 'Change header height' }).click();

  await expect
    .poll(async () => {
      const newHeight = await page
        .locator('[data-testid="top-exclusion-zone"]')
        .evaluate((el) => el.getBoundingClientRect().height);
      return newHeight > initialTopHeight;
    })
    .toBe(true);
});

test('user wheel scrolling before delayed data readiness cancels initial restoration', async ({
  page,
}) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await page.locator('.viewport').hover();
  await page.mouse.wheel(0, 100);
  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('#eintrag-4')).toBeAttached();
  await page.waitForTimeout(300);
  const isAligned = await page.locator('#eintrag-4').evaluate((el) => {
    const scroller = document.querySelector('.viewport')!;
    return Math.abs(el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) < 5;
  });
  expect(isAligned).toBe(false);
});

test('user keyboard scrolling before delayed data readiness cancels initial restoration', async ({
  page,
}) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await page.locator('.viewport').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('#eintrag-4')).toBeAttached();
  await page.waitForTimeout(300);
  const isAligned = await page.locator('#eintrag-4').evaluate((el) => {
    const scroller = document.querySelector('.viewport')!;
    return Math.abs(el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) < 5;
  });
  expect(isAligned).toBe(false);
});

test('typing inside form controls does not cancel pending initial restoration', async ({
  page,
}) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  // Interact with input inside details
  await page.getByText('Loading behavior', { exact: true }).click();
  await page.getByLabel('Loading delay (ms)').focus();
  await page.keyboard.press('ArrowDown');
  await page.getByLabel('Loading delay (ms)').fill('1200');
  await expect(page.getByRole('status')).toBeHidden();
  await aligned(page, '#eintrag-4', '.viewport');
});

test('explicit navigation functions normally after user cancellation', async ({ page }) => {
  await page.goto('/navigation?delay=1200#eintrag-4');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await page.locator('.viewport').hover();
  await page.mouse.wheel(0, 100);
  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('#eintrag-4')).toBeAttached();
  await page.waitForTimeout(300);

  // Now explicitly navigate to eintrag-2
  await page.locator('.viewport').evaluate((el) => {
    el.scrollTop = 0;
  });
  await placeAnchor(page, '#eintrag-2', '.viewport', 0);
  await expect(page).toHaveURL(/#eintrag-2$/);
});

test('subsequent external router fragment navigation restores target element alignment', async ({
  page,
}) => {
  await page.goto('/document#kapitel-1');
  await aligned(page, '#kapitel-1', '.viewport');

  // Navigate to #kapitel-4 via router navigation
  await page.evaluate(() => {
    window.location.hash = 'kapitel-4';
  });
  await aligned(page, '#kapitel-4', '.viewport');
  await expect(page).toHaveURL(/#kapitel-4$/);

  // Navigate to #kapitel-2
  await page.evaluate(() => {
    window.location.hash = 'kapitel-2';
  });
  await aligned(page, '#kapitel-2', '.viewport');
  await expect(page).toHaveURL(/#kapitel-2$/);
});

test('browser history back and forward navigation automatically restores fragment position', async ({
  page,
}) => {
  await page.goto('/document#kapitel-1');
  await aligned(page, '#kapitel-1', '.viewport');

  // Push new fragment to history
  await page.evaluate(() => {
    window.location.hash = 'kapitel-3';
  });
  await aligned(page, '#kapitel-3', '.viewport');

  // Browser back
  await page.goBack();
  await aligned(page, '#kapitel-1', '.viewport');
  await expect(page).toHaveURL(/#kapitel-1$/);

  // Browser forward
  await page.goForward();
  await aligned(page, '#kapitel-3', '.viewport');
  await expect(page).toHaveURL(/#kapitel-3$/);
});

test('subsequent navigation during async data loading queues and restores once data is ready', async ({
  page,
}) => {
  await page.goto('/navigation?delay=1200#eintrag-1');
  await expect(page.getByRole('status')).toHaveText('Loading…');

  // Navigate to eintrag-4 while still loading
  await page.evaluate(() => {
    window.location.hash = 'eintrag-4';
  });

  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('#eintrag-4')).toBeAttached();
  await aligned(page, '#eintrag-4', '.viewport');
  await expect(page).toHaveURL(/#eintrag-4$/);
});

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
  await page.clock.runFor(600);
  await expect(page.locator('output')).toHaveText('');
  await page.clock.runFor(450);
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
  await expect(page).toHaveURL(/#projekt-9$/);
  await expect(page.getByRole('button', { name: 'Project 9', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(await page.locator('.portfolio-master').evaluate((el) => el.scrollTop)).toBe(
    masterPosition,
  );
});

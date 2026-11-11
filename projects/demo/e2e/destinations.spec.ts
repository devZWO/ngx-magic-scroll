import { expect, Page } from '@playwright/test';
import { test, aligned, placeAnchor } from './fixtures';

// Longer than the default 500 ms scroll-spy debounce, so a pending publication would have committed.
const SETTLE = 900;
const fragment = (page: Page) => page.evaluate(() => location.hash.split('#').at(-1));
// The last section cannot reach the top: restoration ends at the maximum scroll position.
const atScrollEnd = (page: Page) =>
  expect
    .poll(() =>
      page
        .locator('.viewport')
        .evaluate((el) => el.scrollTop > 0 && el.scrollHeight - el.clientHeight - el.scrollTop <= 1),
    )
    .toBe(true);

test('keeps a deep-linked last section that cannot reach the reading line', async ({ page }) => {
  await page.goto('/#/destinations?keep=yes#ziel-ende');
  await atScrollEnd(page);
  await page.waitForTimeout(SETTLE);
  await page.locator('.viewport').dispatchEvent('scroll');
  await page.waitForTimeout(SETTLE);

  await expect(page).toHaveURL(/keep=yes#ziel-ende$/);
  await expect(page.getByLabel('URL fragment')).toHaveText('ziel-ende');
});

test('keeps a tall section although its nested anchor is fully visible, and repeated links add no entry', async ({
  page,
}) => {
  await page.goto('/#/destinations');
  const toc = page.getByRole('navigation', { name: 'Table of contents' });
  await toc.getByRole('link', { name: 'ziel-projekte', exact: true }).click();
  await aligned(page, '#ziel-projekte', '.viewport');
  const history = await page.evaluate(() => window.history.length);
  await page.waitForTimeout(SETTLE);
  await expect(page).toHaveURL(/#ziel-projekte$/);

  await toc.getByRole('link', { name: 'ziel-projekte', exact: true }).click();
  await page.waitForTimeout(SETTLE);
  await expect(page).toHaveURL(/#ziel-projekte$/);
  expect(await page.evaluate(() => window.history.length)).toBe(history);
});

test('releases the destination when the user scrolls', async ({ page }) => {
  await page.goto('/#/destinations#ziel-ende');
  await atScrollEnd(page);
  await page.locator('.viewport').hover();
  await page.mouse.wheel(0, -900);
  await expect.poll(() => fragment(page)).not.toBe('ziel-ende');
});

test('suspendPublication pauses URL updates until resumed', async ({ page }) => {
  await page.goto('/#/destinations#ziel-einleitung');
  await aligned(page, '#ziel-einleitung', '.viewport');
  const pause = page.getByRole('checkbox', { name: /Pause URL publication/ });

  await pause.check();
  await placeAnchor(page, '#ziel-projekte', '.viewport', 0);
  await page.waitForTimeout(SETTLE);
  await expect(page).toHaveURL(/#ziel-einleitung$/);

  await pause.uncheck();
  await page.locator('.viewport').evaluate((el) => el.scrollBy({ top: -4, behavior: 'instant' }));
  // Scrolled by the user, the tall section yields to its fully visible nested anchor.
  await expect(page).toHaveURL(/#ziel-projekte-liste$/);
});

test('discardPendingPublication drops an update scheduled by an earlier scroll', async ({
  page,
}) => {
  await page.goto('/#/destinations#ziel-einleitung');
  await aligned(page, '#ziel-einleitung', '.viewport');
  // Discard right after the scroll spy scheduled its publication for this scroll event.
  await page.locator('.viewport').evaluate((viewport) => {
    viewport.addEventListener(
      'scroll',
      () =>
        Array.from(document.querySelectorAll('button'))
          .find((button) => button.textContent?.includes('Discard pending update'))!
          .click(),
      { once: true },
    );
    const target = viewport.querySelector<HTMLElement>('#ziel-projekte')!;
    viewport.scrollBy({
      top: target.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
      behavior: 'instant',
    });
  });
  await expect(page.getByLabel('Publication result')).toHaveText('Pending URL update discarded.');
  await page.waitForTimeout(SETTLE);

  await expect(page).toHaveURL(/#ziel-einleitung$/);
});

for (const { protect, back } of [
  { protect: true, back: 'ziel-einleitung' },
  { protect: false, back: 'ziel-projekte-liste' },
]) {
  test(`overlay flow ${protect ? 'with' : 'without'} suspendPublication returns Back to ${back}`, async ({
    page,
  }) => {
    await page.goto('/#/destinations#ziel-einleitung');
    await aligned(page, '#ziel-einleitung', '.viewport');
    const protection = page.getByRole('checkbox', { name: /Protect with/ });
    if (!protect) await protection.uncheck();
    const history = await page.evaluate(() => window.history.length);

    await page.getByRole('button', { name: 'Open contact via overlay' }).click();
    await expect(page).toHaveURL(/#ziel-kontakt$/);
    await expect(page.getByRole('button', { name: 'Open contact via overlay' })).toBeEnabled();
    expect(await page.evaluate(() => window.history.length)).toBe(history + 1);

    await page.goBack();
    await expect.poll(() => fragment(page)).toBe(back);
  });
}

import { expect, test, Page } from '@playwright/test';
async function aligned(page: Page, id: string, container: string) {
  await expect
    .poll(() =>
      page
        .locator(id)
        .evaluate(
          (el, selector) =>
            Math.abs(
              el.getBoundingClientRect().top -
                document.querySelector(selector)!.getBoundingClientRect().top,
            ),
          container,
        ),
    )
    .toBeLessThan(24);
}
test('document synchronizes scroll, fragment and active anchor without adding history', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/document?keep=yes');
  const history = await page.evaluate(() => window.history.length);
  await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
  await expect(page).toHaveURL(/keep=yes#kapitel-3$/);
  await expect(page.locator('output')).toHaveText('kapitel-3');
  await aligned(page, '#kapitel-3', '.viewport');
  await page.locator('.viewport').evaluate((el) => (el.scrollTop = 840));
  await expect(page).toHaveURL(/#kapitel-4$/);
  expect(await page.evaluate(() => window.history.length)).toBe(history);
  expect(errors).toEqual([]);
});
test('navigation restores after async loading, browser back, reload and resize', async ({
  page,
}) => {
  await page.goto('/navigation?keep=yes#eintrag-4');
  await aligned(page, '#eintrag-4', '.viewport');
  await page.getByRole('link', { name: 'Details zu 4', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Details zu 4' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/keep=yes#eintrag-4$/);
  await aligned(page, '#eintrag-4', '.viewport');
  await page.reload();
  await aligned(page, '#eintrag-4', '.viewport');
  await page.setViewportSize({ width: 900, height: 700 });
  await aligned(page, '#eintrag-4', '.viewport');
});
test('Material drawer supports restoration, scroll synchronization, reload and pagination', async ({
  page,
}) => {
  await page.goto('/drawer#antrag-card-4');
  await aligned(page, '#antrag-card-4', 'mat-drawer-content');
  await page.getByRole('button', { name: 'Antrag 6', exact: true }).click();
  await expect(page).toHaveURL(/#antrag-card-6$/);
  await page.getByRole('link', { name: 'Antrag 6 öffnen', exact: true }).click();
  await page.goBack();
  await aligned(page, '#antrag-card-6', 'mat-drawer-content');
  await page.getByRole('button', { name: 'Weitere Anträge laden' }).click();
  await expect(page.locator('#antrag-card-12')).toBeAttached();
  await aligned(page, '#antrag-card-6', 'mat-drawer-content');
  await page.getByRole('button', { name: 'Daten neu laden' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toBeHidden();
  await aligned(page, '#antrag-card-6', 'mat-drawer-content');
  await page.getByRole('button', { name: 'Antrag 10', exact: true }).click();
  await expect(page).toHaveURL(/count=12#antrag-card-10$/);
  await page.getByRole('link', { name: 'Antrag 10 öffnen', exact: true }).click();
  await page.goBack();
  await aligned(page, '#antrag-card-10', 'mat-drawer-content');
  await page.reload();
  await aligned(page, '#antrag-card-10', 'mat-drawer-content');
  await page.getByRole('button', { name: 'Navigation umschalten' }).click();
  await expect(page.locator('mat-drawer')).not.toBeVisible();
  await page.setViewportSize({ width: 850, height: 650 });
  await aligned(page, '#antrag-card-10', 'mat-drawer-content');
});

test('master-detail scrolls the document independently of master and accounts for dynamic header height', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/master-detail?keep=yes#projekt-8');
  const master = page.locator('.portfolio-master');
  async function belowHeader(id: number) {
    await expect
      .poll(() =>
        page
          .locator('#projekt-' + id)
          .evaluate((el) =>
            Math.abs(
              el.getBoundingClientRect().top -
                document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom -
                16,
            ),
          ),
      )
      .toBeLessThan(3);
  }
  await belowHeader(8);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  const position = await page.evaluate(() => window.scrollY);
  await master.evaluate((el) => (el.scrollTop = 350));
  expect(await master.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(position);
  await page.getByRole('button', { name: 'Projekt 12', exact: true }).click();
  await belowHeader(12);
  await expect(page).toHaveURL(/keep=yes#projekt-12$/);
  const height = Number(await page.getByTestId('header-height').textContent());
  await page.getByRole('button', { name: 'Headerhöhe ändern' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('header-height').textContent()))
    .toBeGreaterThan(height);
  await belowHeader(12);
  await page.setViewportSize({ width: 650, height: 700 });
  await belowHeader(12);
  await page.reload();
  await belowHeader(12);
  await page.locator('#projekt-15').evaluate((el) =>
    window.scrollBy({
      top:
        el.getBoundingClientRect().top -
        document.querySelector('.portfolio-header')!.getBoundingClientRect().bottom -
        16,
      behavior: 'instant',
    }),
  );
  await expect(page).toHaveURL(/#projekt-15$/);
  expect(errors).toEqual([]);
});

async function atOffset(page: Page, anchor: string, container: string, offset: number) {
  await expect
    .poll(() =>
      page
        .locator(anchor)
        .evaluate(
          (el, args) =>
            Math.abs(
              el.getBoundingClientRect().top -
                document.querySelector(args.container)!.getBoundingClientRect().top -
                args.offset,
            ),
          { container, offset },
        ),
    )
    .toBeLessThan(2);
}
test('document options apply smooth scrolling, offsets, visibility rules and anchor filtering', async ({
  page,
}) => {
  await page.goto('/document');
  await page.getByText('Optionen', { exact: true }).click();
  await page.getByLabel('Scroll-Verhalten').selectOption('smooth');
  await page.getByLabel('Oberer Abstand').selectOption('20');
  await page.getByLabel('Scroll-Spy-Verzögerung').selectOption('150');
  await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
  await atOffset(page, '#kapitel-3', '.viewport', 20);
  await expect(page).toHaveURL(/#kapitel-3$/);
  const top = await page.locator('.viewport').evaluate((el) => el.scrollTop);
  for (const mode of ['top', 'full', 'always']) {
    await page.getByLabel('Scrollen überspringen').selectOption(mode);
    await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Scroll-Ergebnis' })).toContainText(
      'übersprungen',
    );
    expect(await page.locator('.viewport').evaluate((el) => el.scrollTop)).toBe(top);
  }
  await page.getByLabel('Scrollen überspringen').selectOption('none');
  await page.getByRole('button', { name: 'kapitel-3', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Scroll-Ergebnis' })).toHaveText(
    'Scrollen ausgeführt.',
  );
  await page.getByLabel('Nur Kapitel-Anker berücksichtigen').uncheck();
  await page.getByLabel('Scroll-Spy-Verzögerung').selectOption('0');
  await page.locator('#zwischen-kapitel-4').evaluate((el) => {
    const viewport = document.querySelector<HTMLElement>('.viewport')!;
    viewport.scrollBy({
      top: el.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 20,
      behavior: 'instant',
    });
  });
  await expect(page).toHaveURL(/#zwischen-kapitel-4$/);
});
test('navigation options survive back navigation and restore asynchronously with smooth behavior and offset', async ({
  page,
}) => {
  await page.goto('/navigation?scroll=smooth&offset=64#eintrag-4');
  await atOffset(page, '#eintrag-4', '.viewport', 64);
  await page.getByText('Optionen', { exact: true }).click();
  await expect(page.getByLabel('Scroll-Verhalten')).toHaveValue('smooth');
  await expect(page.getByLabel('Oberer Abstand')).toHaveValue('64');
  await page.getByRole('link', { name: 'Details zu 4', exact: true }).click();
  await page.goBack();
  await atOffset(page, '#eintrag-4', '.viewport', 64);
  await page.reload();
  await atOffset(page, '#eintrag-4', '.viewport', 64);
});
test('drawer options preserve the visible anchor when data is inserted above it', async ({
  page,
}) => {
  await page.goto('/drawer#antrag-card-4');
  await aligned(page, '#antrag-card-4', 'mat-drawer-content');
  await page.getByText('Optionen', { exact: true }).click();
  await page.getByLabel('Scroll-Verhalten').selectOption('smooth');
  await page.getByLabel('Oberer Abstand').selectOption('20');
  await page.getByRole('button', { name: 'Antrag 6', exact: true }).click();
  await atOffset(page, '#antrag-card-6', 'mat-drawer-content', 20);
  await expect(page).toHaveURL(/#antrag-card-6$/);
  await page.getByRole('button', { name: 'Drei Anträge oben einfügen' }).click();
  await expect(page.locator('#antrag-card--3')).toBeAttached();
  await atOffset(page, '#antrag-card-6', 'mat-drawer-content', 20);
  await page.getByLabel('Anker bei Datenänderungen erhalten').uncheck();
  await page.locator('mat-drawer-content').evaluate((el) => (el.style.overflowAnchor = 'none'));
  await page.getByRole('button', { name: 'Drei Anträge oben einfügen' }).click();
  await expect(page.locator('#antrag-card--6')).toBeAttached();
  await expect
    .poll(() =>
      page
        .locator('#antrag-card-6')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().top -
            document.querySelector('mat-drawer-content')!.getBoundingClientRect().top,
        ),
    )
    .toBeGreaterThan(480);
});

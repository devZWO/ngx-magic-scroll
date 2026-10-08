import { expect, test as base, Page } from '@playwright/test';

// A handled resource failure is displayed in the demo; uncaught errors must fail every test.
export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use();
      expect(errors, 'No uncaught browser or console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export async function atOffset(page: Page, anchor: string, container: string, offset: number) {
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
export async function aligned(page: Page, anchor: string, container: string) {
  await atOffset(page, anchor, container, 0);
}
export async function placeAnchor(page: Page, anchor: string, container: string, top: number) {
  await page.locator(anchor).evaluate(
    (el, args) => {
      const scroller = document.querySelector<HTMLElement>(args.container)!;
      scroller.scrollBy({
        top: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - args.top,
        behavior: 'instant',
      });
    },
    { container, top },
  );
  await atOffset(page, anchor, container, top);
}

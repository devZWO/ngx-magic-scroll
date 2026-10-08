import { expect, test } from '@playwright/test';

test('demo loads without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello, demo' })).toBeVisible();
  expect(errors).toEqual([]);
});

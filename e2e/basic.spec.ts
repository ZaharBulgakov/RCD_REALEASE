import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/RandomChessDebut/);
});

test('shows auth screen when not logged in', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Should see the main tagline or button
  await expect(page.locator('text=Выучи шахматные дебюты в пару кликов!')).toBeVisible();
  await expect(page.locator('button:has-text("Начать тренировку")')).toBeVisible();
});

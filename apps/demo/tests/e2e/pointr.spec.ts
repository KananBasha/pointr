import { test, expect } from '@playwright/test';

test.describe('Pointr overlay — integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to hydrate
    await page.waitForSelector('.header', { timeout: 5000 });
  });

  test('data-pointr-source attributes injected on all JSX elements', async ({ page }) => {
    const count = await page.locator('[data-pointr-source]').count();
    expect(count).toBeGreaterThan(3);
  });

  test('data-pointr-source format is valid (file:line:col)', async ({ page }) => {
    const attr = await page.locator('[data-pointr-source]').first().getAttribute('data-pointr-source');
    // Should match "path/to/file.tsx:42:5"
    expect(attr).toMatch(/\.(tsx?|jsx?):\d+:\d+$/);
  });

  test('no data-pointr-source on native html elements without JSX wrapper', async ({ page }) => {
    // The <html>, <head>, <body> should NOT have the attribute
    const htmlAttr = await page.locator('html').getAttribute('data-pointr-source');
    expect(htmlAttr).toBeNull();
  });

  test('Alt keydown activates Pointr indicator badge', async ({ page }) => {
    await page.keyboard.down('Alt');
    // Indicator badge "⊕ Pointr active" should appear in bottom-right
    const indicator = page.locator('text=Pointr active');
    await expect(indicator).toBeVisible({ timeout: 1000 });
    await page.keyboard.up('Alt');
  });

  test('Alt keyup hides Pointr indicator badge', async ({ page }) => {
    await page.keyboard.down('Alt');
    await page.keyboard.up('Alt');
    // After release, indicator should be hidden (display:none)
    const indicator = page.locator('text=Pointr active');
    await expect(indicator).not.toBeVisible({ timeout: 1000 });
  });

  test('Alt+Click opens intent dialog on .cta-button', async ({ page }) => {
    await page.keyboard.down('Alt');
    await page.locator('.cta-button').click({ modifiers: ['Alt'] });
    await page.keyboard.up('Alt');
    // Floating dialog should appear
    const dialog = page.locator('#__pointr_dialog__');
    await expect(dialog).toBeVisible({ timeout: 2000 });
  });

  test('Escape dismisses intent dialog', async ({ page }) => {
    await page.keyboard.down('Alt');
    await page.locator('.cta-button').click({ modifiers: ['Alt'] });
    await page.keyboard.up('Alt');

    await expect(page.locator('#__pointr_dialog__')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#__pointr_dialog__')).not.toBeVisible();
  });
});

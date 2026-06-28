/**
 * OutreachOS — LinkedIn Management & Automation Platform
 * Copyright (c) 2026 Aryan Suthar. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of the copyright owner.
 *
 * For licensing inquiries: aryanrajendrasuthar@gmail.com
 */

import { expect, test } from '@playwright/test';
import { login } from './helpers/auth.js';

test.describe('Prospects', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('prospects page loads the table', async ({ page }) => {
    await page.goto('/prospects');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
  });

  test('can search/filter prospects by name', async ({ page }) => {
    await page.goto('/prospects');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Jane');
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 5000 });
  });

  test('clicking a prospect row opens detail drawer', async ({ page }) => {
    await page.goto('/prospects');
    const firstRow = page.getByRole('row').nth(1);
    await firstRow.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('bulk select toolbar appears when prospects are checked', async ({ page }) => {
    await page.goto('/prospects');
    const firstCheckbox = page.getByRole('checkbox').nth(1);
    await firstCheckbox.check();
    await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 3000 });
  });
});

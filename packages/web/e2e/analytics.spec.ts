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

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('analytics page renders without crashing', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('area chart SVG is rendered', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({ timeout: 8000 });
  });

  test('funnel chart is rendered', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('.recharts-responsive-container').nth(1)).toBeVisible({ timeout: 8000 });
  });

  test('A/B template table is present', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
  });
});

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

test.describe('HITL Outreach Queue', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('queue page renders pending approval cards or empty state', async ({ page }) => {
    await page.goto('/outreach/queue');
    const hasCards = await page.getByRole('article').count() > 0;
    const hasEmptyState = await page.getByText(/no messages/i).isVisible().catch(() => false);
    expect(hasCards || hasEmptyState).toBe(true);
  });

  test('approve button sends the message and removes card', async ({ page }) => {
    await page.goto('/outreach/queue');
    const cards = page.getByRole('article');
    const count = await cards.count();
    if (count === 0) return; // skip if queue is empty in this environment

    const firstCard = cards.first();
    const approveBtn = firstCard.getByRole('button', { name: /approve/i });
    await approveBtn.click();
    await expect(cards).toHaveCount(count - 1, { timeout: 5000 });
  });

  test('edit textarea updates before approval', async ({ page }) => {
    await page.goto('/outreach/queue');
    const textarea = page.getByRole('textbox').first();
    if (!(await textarea.isVisible())) return;

    await textarea.fill('Custom edited message for testing');
    await expect(textarea).toHaveValue('Custom edited message for testing');
  });

  test('reject button removes the card from queue', async ({ page }) => {
    await page.goto('/outreach/queue');
    const cards = page.getByRole('article');
    const count = await cards.count();
    if (count === 0) return;

    const rejectBtn = cards.first().getByRole('button', { name: /reject|skip|decline/i });
    await rejectBtn.click();
    await expect(cards).toHaveCount(count - 1, { timeout: 5000 });
  });
});

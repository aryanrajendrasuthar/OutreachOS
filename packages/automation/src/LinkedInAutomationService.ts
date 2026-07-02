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

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { BrowserContext, Page } from 'playwright';
import pino from 'pino';
import type { InboxMessage, ProspectProfile, SearchCriteria } from '@outreachos/shared';

chromium.use(StealthPlugin());

const logger = pino({ name: 'automation' });

const PROFILES_DIR = path.join(os.homedir(), '.outreachos', 'profiles');
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export class SessionExpiredError extends Error {
  constructor() {
    super('LinkedIn session expired — please reconnect in Settings');
    this.name = 'SessionExpiredError';
  }
}

function randomViewport() {
  return {
    width: Math.floor(Math.random() * (1920 - 1280 + 1)) + 1280,
    height: Math.floor(Math.random() * (1080 - 720 + 1)) + 720,
  };
}

async function humanMouseMove(page: Page, targetX: number, targetY: number): Promise<void> {
  const steps = Math.floor(Math.random() * 10) + 5;
  const currentX = Math.floor(Math.random() * 800) + 100;
  const currentY = Math.floor(Math.random() * 600) + 100;
  for (let i = 1; i <= steps; i++) {
    const x = currentX + ((targetX - currentX) * i) / steps + (Math.random() - 0.5) * 10;
    const y = currentY + ((targetY - currentY) * i) / steps + (Math.random() - 0.5) * 10;
    await page.mouse.move(x, y);
  }
}

export class LinkedInAutomationService {
  private context: BrowserContext | null = null;
  private readonly profileDir: string;

  constructor(userId: string) {
    this.profileDir = path.join(PROFILES_DIR, userId);
  }

  private async ensureContext(): Promise<BrowserContext> {
    if (this.context) return this.context;

    await fs.mkdir(this.profileDir, { recursive: true });

    this.context = await chromium.launchPersistentContext(this.profileDir, {
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      userAgent: USER_AGENT,
      viewport: randomViewport(),
    });

    return this.context;
  }

  // One-time setup: opens a real browser window so the user can log in to LinkedIn.
  // The session is saved to disk and reused on every subsequent automation run.
  static async setupSession(userId: string): Promise<void> {
    const profileDir = path.join(PROFILES_DIR, userId);
    await fs.mkdir(profileDir, { recursive: true });

    const ctx = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userAgent: USER_AGENT,
    });

    const page = await ctx.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    // Wait up to 5 minutes for the user to log in manually
    await page.waitForURL(/linkedin\.com\/(feed|mynetwork|jobs|messaging|notifications)/, {
      timeout: 300_000,
    });

    logger.info({ userId }, 'LinkedIn session established via persistent context');
    await ctx.close();
  }

  async isSessionValid(): Promise<boolean> {
    try {
      // Fast check: does a Cookies file exist in the profile?
      await fs.access(path.join(this.profileDir, 'Default', 'Cookies'));
      return true;
    } catch {
      return false;
    }
  }

  async sendConnectionRequest(profileUrl: string, note: string): Promise<boolean> {
    const ctx = await this.ensureContext();
    const page = await ctx.newPage();

    try {
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      if (page.url().includes('/login') || page.url().includes('/authwall')) {
        throw new SessionExpiredError();
      }

      await page.waitForTimeout(2000 + Math.random() * 1000);

      const vanityName = profileUrl.split('/in/')[1]?.replace(/\/$/, '').split('?')[0];
      let clicked = false;

      const connectLink = page
        .locator(
          vanityName
            ? `a[href*="custom-invite"][href*="${vanityName}"]`
            : 'a[href*="custom-invite"]',
        )
        .first();

      if (await connectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await connectLink.boundingBox();
        if (box) await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
          connectLink.evaluate((el) => (el as HTMLAnchorElement).click()),
        ]);
        clicked = true;
      } else {
        const connectBtn = page.locator('button[aria-label*="connect" i]').first();
        if (await connectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
            connectBtn.evaluate((el) => (el as HTMLButtonElement).click()),
          ]);
          clicked = true;
        }
      }

      if (!clicked) {
        logger.warn({ profileUrl }, 'No Connect button found — profile may be Follow-only, already connected, or pending');
        return false;
      }

      // Wait for the invite dialog to render after the preload redirect
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForSelector(
        'button:has-text("Add a note"), button:has-text("Send without a note"), textarea[name="message"]',
        { timeout: 10000 },
      ).catch(() => {});
      await page.waitForTimeout(800);

      logger.info({ postConnectUrl: page.url() }, 'Post-connect page');

      // Click "Add a note" if textarea isn't already visible
      const textarea = page.locator('textarea[name="message"]').first();
      if (!(await textarea.isVisible({ timeout: 1000 }).catch(() => false))) {
        const addNoteBtn = page.locator('button:has-text("Add a note")').first();
        if (await addNoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addNoteBtn.evaluate((el) => (el as HTMLButtonElement).click());
          await page.waitForTimeout(800);
          await textarea.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        }
      }

      // Type note character-by-character so React's onChange fires and enables Send
      if (note && (await textarea.isVisible({ timeout: 2000 }).catch(() => false))) {
        await textarea.click();
        await textarea.pressSequentially(note, { delay: 25 + Math.random() * 20 });
        await page.waitForTimeout(500);
      }

      const btnTexts = await page.locator('button:visible').allTextContents().catch(() => [] as string[]);
      logger.info({ buttons: btnTexts.map((t) => t.trim()).filter(Boolean) }, 'Visible buttons before send');

      const sendBtn = page
        .locator('button:visible')
        .filter({ hasNotText: /without/i })
        .filter({ hasText: /send/i })
        .last();
      await sendBtn.waitFor({ state: 'visible', timeout: 7000 });
      await sendBtn.evaluate((el) => (el as HTMLButtonElement).click());
      await page.waitForTimeout(2000);

      logger.info({ profileUrl }, 'Connection request sent');
      return true;
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ERR_TOO_MANY_REDIRECTS')) throw new SessionExpiredError();
      logger.error({ err, profileUrl }, 'Failed to send connection request');
      return false;
    } finally {
      await page.close();
    }
  }

  async sendMessage(profileUrl: string, body: string): Promise<boolean> {
    const ctx = await this.ensureContext();
    const page = await ctx.newPage();

    try {
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
      if (page.url().includes('/login') || page.url().includes('/authwall')) throw new SessionExpiredError();
      await page.waitForTimeout(1500 + Math.random() * 1000);

      const messageBtn = page.locator('button:has-text("Message")').first();
      const box = await messageBtn.boundingBox();
      if (box) await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
      await messageBtn.click();

      const msgBox = page.locator('.msg-form__contenteditable').first();
      await msgBox.click();
      await msgBox.pressSequentially(body, { delay: 30 + Math.random() * 40 });

      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      logger.info({ profileUrl }, 'Message sent');
      return true;
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ERR_TOO_MANY_REDIRECTS')) throw new SessionExpiredError();
      logger.error({ err, profileUrl }, 'Failed to send message');
      return false;
    } finally {
      await page.close();
    }
  }

  async scrapeProfile(profileUrl: string): Promise<ProspectProfile> {
    const ctx = await this.ensureContext();
    const page = await ctx.newPage();

    try {
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000 + Math.random() * 1000);

      const fullName = await page
        .locator('h1.text-heading-xlarge')
        .textContent()
        .then((t) => t?.trim() ?? '');
      const headline = await page
        .locator('.text-body-medium.break-words')
        .first()
        .textContent()
        .then((t) => t?.trim());
      const location = await page
        .locator('.pb2.pv-text-details__left-panel span.text-body-small')
        .first()
        .textContent()
        .then((t) => t?.trim());

      return { fullName, headline: headline ?? '', location: location ?? '', profileSnapshot: { url: profileUrl, scrapedAt: new Date().toISOString() } };
    } finally {
      await page.close();
    }
  }

  async searchProspects(criteria: SearchCriteria): Promise<string[]> {
    const ctx = await this.ensureContext();
    const page = await ctx.newPage();

    try {
      const params = new URLSearchParams({ keywords: criteria.keywords ?? '', origin: 'GLOBAL_SEARCH_HEADER' });
      await page.goto(`https://www.linkedin.com/search/results/people/?${params}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      return await page
        .locator('a.app-aware-link[href*="/in/"]')
        .evaluateAll((els) =>
          [...new Set(els.map((el) => (el as HTMLAnchorElement).href).filter((h) => h.includes('/in/')))].slice(0, criteria.limit ?? 25),
        );
    } finally {
      await page.close();
    }
  }

  async checkInbox(): Promise<InboxMessage[]> {
    const ctx = await this.ensureContext();
    const page = await ctx.newPage();

    try {
      await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const threads = await page.locator('.msg-conversation-listitem').all();
      const messages: InboxMessage[] = [];

      for (const thread of threads.slice(0, 20)) {
        const name = await thread.locator('.msg-conversation-listitem__participant-names').textContent().then((t) => t?.trim() ?? '');
        const body = await thread.locator('.msg-conversation-listitem__message-snippet').textContent().then((t) => t?.trim() ?? '');
        messages.push({ profileUrl: '', senderName: name, body, receivedAt: new Date() });
      }

      return messages;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    this.context = null;
  }
}

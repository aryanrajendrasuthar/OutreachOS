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

import { chromium } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';
import pino from 'pino';
import { decrypt } from '@outreachos/shared';
import type { InboxMessage, ProspectProfile, SearchCriteria } from '@outreachos/shared';

chromium.use(StealthPlugin());

const logger = pino({ name: 'automation' });

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
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly encryptedCookie: string;
  private readonly encryptionKey: string;

  constructor(encryptedCookie: string, encryptionKey: string) {
    this.encryptedCookie = encryptedCookie;
    this.encryptionKey = encryptionKey;
  }

  private async ensureBrowser(): Promise<BrowserContext> {
    if (this.context) return this.context;

    this.browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const viewport = randomViewport();
    this.context = await this.browser.newContext({
      viewport,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const rawCookie = decrypt(this.encryptedCookie, this.encryptionKey);
    await this.context.addCookies([
      {
        name: 'li_at',
        value: rawCookie,
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);

    return this.context;
  }

  async isSessionValid(): Promise<boolean> {
    try {
      const ctx = await this.ensureBrowser();
      const page = await ctx.newPage();
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
      const isValid = !page.url().includes('/login');
      await page.close();
      return isValid;
    } catch (err) {
      logger.warn({ err }, 'Session validity check failed');
      return false;
    }
  }

  async sendConnectionRequest(profileUrl: string, note: string): Promise<boolean> {
    const ctx = await this.ensureBrowser();
    const page = await ctx.newPage();

    try {
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500 + Math.random() * 1000);

      const connectBtn = page.locator('button:has-text("Connect")').first();
      const box = await connectBtn.boundingBox();
      if (box) await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
      await connectBtn.click();

      if (note) {
        const addNoteBtn = page.locator('button:has-text("Add a note")').first();
        await addNoteBtn.click();
        const textarea = page.locator('textarea[name="message"]');
        await textarea.fill(note);
      }

      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(1000);
      logger.info({ profileUrl }, 'Connection request sent');
      return true;
    } catch (err) {
      logger.error({ err, profileUrl }, 'Failed to send connection request');
      return false;
    } finally {
      await page.close();
    }
  }

  async sendMessage(profileUrl: string, body: string): Promise<boolean> {
    const ctx = await this.ensureBrowser();
    const page = await ctx.newPage();

    try {
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500 + Math.random() * 1000);

      const messageBtn = page.locator('button:has-text("Message")').first();
      const box = await messageBtn.boundingBox();
      if (box) await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
      await messageBtn.click();

      const msgBox = page.locator('.msg-form__contenteditable').first();
      await msgBox.click();
      await msgBox.type(body, { delay: 30 + Math.random() * 40 });

      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      logger.info({ profileUrl }, 'Message sent');
      return true;
    } catch (err) {
      logger.error({ err, profileUrl }, 'Failed to send message');
      return false;
    } finally {
      await page.close();
    }
  }

  async scrapeProfile(profileUrl: string): Promise<ProspectProfile> {
    const ctx = await this.ensureBrowser();
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

      const profileSnapshot = { url: profileUrl, scrapedAt: new Date().toISOString() };

      return { fullName, headline, location, profileSnapshot };
    } finally {
      await page.close();
    }
  }

  async searchProspects(criteria: SearchCriteria): Promise<string[]> {
    const ctx = await this.ensureBrowser();
    const page = await ctx.newPage();

    try {
      const params = new URLSearchParams({
        keywords: criteria.keywords ?? '',
        origin: 'GLOBAL_SEARCH_HEADER',
        sid: Math.random().toString(36).slice(2),
      });

      await page.goto(`https://www.linkedin.com/search/results/people/?${params.toString()}`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(2000);

      const profileLinks = await page
        .locator('a.app-aware-link[href*="/in/"]')
        .evaluateAll((els) =>
          els
            .map((el) => (el as HTMLAnchorElement).href)
            .filter((h) => h.includes('/in/'))
            .slice(0, criteria.limit ?? 25),
        );

      return [...new Set(profileLinks)];
    } finally {
      await page.close();
    }
  }

  async checkInbox(): Promise<InboxMessage[]> {
    const ctx = await this.ensureBrowser();
    const page = await ctx.newPage();

    try {
      await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const threads = await page.locator('.msg-conversation-listitem').all();
      const messages: InboxMessage[] = [];

      for (const thread of threads.slice(0, 20)) {
        const name = await thread
          .locator('.msg-conversation-listitem__participant-names')
          .textContent()
          .then((t) => t?.trim() ?? '');
        const body = await thread
          .locator('.msg-conversation-listitem__message-snippet')
          .textContent()
          .then((t) => t?.trim() ?? '');

        messages.push({ profileUrl: '', senderName: name, body, receivedAt: new Date() });
      }

      return messages;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.context = null;
  }
}

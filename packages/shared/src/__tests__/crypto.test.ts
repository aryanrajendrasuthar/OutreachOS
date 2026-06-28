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

import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, generateSecureToken, safeCompare } from '../crypto.js';

function makeKey(): string {
  return randomBytes(32).toString('base64');
}

describe('encrypt / decrypt', () => {
  it('roundtrips a plain string', () => {
    const key = makeKey();
    const plaintext = 'Hello, OutreachOS!';
    expect(decrypt(encrypt(plaintext, key), key)).toBe(plaintext);
  });

  it('roundtrips an empty string', () => {
    const key = makeKey();
    expect(decrypt(encrypt('', key), key)).toBe('');
  });

  it('roundtrips a long string', () => {
    const key = makeKey();
    const plaintext = 'a'.repeat(10_000);
    expect(decrypt(encrypt(plaintext, key), key)).toBe(plaintext);
  });

  it('roundtrips unicode content', () => {
    const key = makeKey();
    const plaintext = '🔐 LinkedIn session cookie 🍪 — üñíçödé';
    expect(decrypt(encrypt(plaintext, key), key)).toBe(plaintext);
  });

  it('produces different ciphertext on every call (random IV)', () => {
    const key = makeKey();
    const plaintext = 'same input';
    const enc1 = encrypt(plaintext, key);
    const enc2 = encrypt(plaintext, key);
    expect(enc1).not.toBe(enc2);
  });

  it('throws on wrong key', () => {
    const key1 = makeKey();
    const key2 = makeKey();
    const encrypted = encrypt('secret', key1);
    expect(() => decrypt(encrypted, key2)).toThrow();
  });

  it('throws on tampered ciphertext', () => {
    const key = makeKey();
    const encrypted = encrypt('secret', key);
    const tampered = encrypted.replace(/.$/, 'X');
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it('throws on malformed value (missing colons)', () => {
    const key = makeKey();
    expect(() => decrypt('notvalidformat', key)).toThrow('Invalid encrypted value format.');
  });

  it('throws on wrong key length', () => {
    const shortKey = randomBytes(16).toString('base64');
    expect(() => encrypt('test', shortKey)).toThrow('256-bit');
  });
});

describe('safeCompare', () => {
  it('returns true for equal strings', () => {
    expect(safeCompare('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(safeCompare('abc', 'xyz')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(safeCompare('short', 'longer')).toBe(false);
  });
});

describe('generateSecureToken', () => {
  it('returns a hex string of expected length', () => {
    const token = generateSecureToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = Array.from({ length: 100 }, () => generateSecureToken());
    const unique = new Set(tokens);
    expect(unique.size).toBe(100);
  });

  it('respects custom byte length', () => {
    expect(generateSecureToken(16)).toHaveLength(32);
    expect(generateSecureToken(64)).toHaveLength(128);
  });
});

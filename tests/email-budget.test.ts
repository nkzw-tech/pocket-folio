/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  emailBudgetKey,
  emailCooldownSeconds,
  emailDailyLimit,
  emailWindowSeconds,
  reserveEmailSQL,
} from '../src/server/email-budget';

function budget() {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE account_email_budget (key TEXT PRIMARY KEY, count INTEGER NOT NULL, lastSentAt INTEGER NOT NULL, windowStartedAt INTEGER NOT NULL)',
  );
  const statement = db.prepare(reserveEmailSQL);
  return {
    close: () => db.close(),
    reserve: (key: string, now: number) =>
      !!statement.get(key, now, emailWindowSeconds, emailCooldownSeconds, emailDailyLimit),
  };
}
describe('account email sending budget', () => {
  it('allows one send per minute and five per 24-hour window, without extending blocked windows', () => {
    const { close, reserve } = budget();
    try {
      expect(reserve('recipient', 1000)).toBe(true);
      for (let attempt = 0; attempt < 20; attempt++) {
        expect(reserve('recipient', 1000)).toBe(false);
      }
      expect(reserve('recipient', 1059)).toBe(false);
      for (let count = 1; count < 5; count++) {
        expect(reserve('recipient', 1000 + count * 60)).toBe(true);
      }
      expect(reserve('recipient', 1300)).toBe(false);
      expect(reserve('recipient', 1000 + emailWindowSeconds - 1)).toBe(false);
      expect(reserve('recipient', 1000 + emailWindowSeconds)).toBe(true);
    } finally {
      close();
    }
  });
  it('normalizes address case, keeps recipient addresses out of keys, and separates verification from recovery', async () => {
    const verify = await emailBudgetKey('verify', ' Person@Example.COM ');
    expect(verify).toBe(await emailBudgetKey('verify', 'person@example.com'));
    expect(verify).not.toContain('person');
    expect(verify).not.toContain('@');
    const reset = await emailBudgetKey('reset', 'person@example.com');
    const another = await emailBudgetKey('verify', 'other@example.com');
    const { close, reserve } = budget();
    try {
      expect(reserve(verify, 1000)).toBe(true);
      expect(reserve(verify, 1000)).toBe(false);
      expect(reserve(reset, 1000)).toBe(true);
      expect(reserve(another, 1000)).toBe(true);
    } finally {
      close();
    }
  });
});

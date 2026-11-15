export type AccountEmailKind = 'reset' | 'verify';
export const emailCooldownSeconds = 60;
export const emailWindowSeconds = 24 * 60 * 60;
export const emailDailyLimit = 5;

// One atomic reservation across all Workers and IP addresses. Failed/uncertain
// provider submissions still count, so retrying cannot flood a recipient.
export const reserveEmailSQL = `
  INSERT INTO account_email_budget (key, count, lastSentAt, windowStartedAt)
  VALUES (?1, 1, ?2, ?2)
  ON CONFLICT(key) DO UPDATE SET
    count = CASE WHEN windowStartedAt <= ?2 - ?3 THEN 1 ELSE count + 1 END,
    windowStartedAt = CASE WHEN windowStartedAt <= ?2 - ?3 THEN ?2 ELSE windowStartedAt END,
    lastSentAt = ?2
  WHERE lastSentAt <= ?2 - ?4
    AND (count < ?5 OR windowStartedAt <= ?2 - ?3)
  RETURNING key
`;

export async function emailBudgetKey(kind: AccountEmailKind, email: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  return `${kind}:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function reserveAccountEmail(db: D1Database, kind: AccountEmailKind, email: string) {
  const key = await emailBudgetKey(kind, email);
  const reservation = await db
    .withSession('first-primary')
    .prepare(reserveEmailSQL)
    .bind(
      key,
      Math.floor(Date.now() / 1000),
      emailWindowSeconds,
      emailCooldownSeconds,
      emailDailyLimit,
    )
    .first();
  return reservation !== null;
}

import { and, eq } from 'drizzle-orm';
import type { CloudContext } from 'void';
import { getAuth, getSession } from 'void/auth';
import type { z } from 'zod';
import { agentKeyPolicy, user } from '../../db/schema';
import { primaryDb } from '../../db/workspace';
import { ApiError, type Grant, type Scope } from './policy';
export async function jsonBody<T>(
  c: CloudContext,
  schema: z.ZodType<T>,
  limit = 500_000,
): Promise<T> {
  if (Number(c.req.header('content-length')) > limit) {
    throw new ApiError(413, 'Request too large.');
  }
  const reader = c.req.raw.body?.getReader();
  if (!reader) {
    throw new ApiError(400, 'JSON body required.');
  }
  const chunks: Array<Uint8Array> = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ApiError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new ApiError(400, 'Invalid request. Check the API schema and card printing IDs.');
  }
}
export function sessionOwner(c: CloudContext, write = false) {
  const session = getSession();
  if (!session) {
    throw new ApiError(401, 'Sign in to manage your account.');
  }
  if (write && c.req.header('origin') !== new URL(c.req.url).origin) {
    throw new ApiError(403, 'Invalid request origin.');
  }
  return session.user.id;
}
export async function requireVerifiedEmail(userId: string) {
  // Read the current account from the primary, not a cached browser session or
  // the verification state at key creation time.
  const [account] = await primaryDb()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  if (!account?.emailVerified) {
    throw new ApiError(403, 'Verify your email before creating or using API keys.');
  }
}
export async function authenticateKey(c: CloudContext, required?: Scope): Promise<Grant> {
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer pkmn_') || authorization.length > 512) {
    throw new ApiError(401, 'A valid API key is required.');
  }
  const result = await getAuth(c).api.verifyApiKey({ body: { key: authorization.slice(7) } });
  if (!result.valid || !result.key) {
    throw new ApiError(
      result.error?.code === 'RATE_LIMITED' ? 429 : 401,
      'API key invalid, expired, revoked, or rate limited.',
    );
  }
  const db = primaryDb();
  const [policy] = await db
    .select()
    .from(agentKeyPolicy)
    .where(
      and(eq(agentKeyPolicy.id, result.key.id), eq(agentKeyPolicy.userId, result.key.referenceId)),
    );
  if (!policy || policy.revokedAt !== null || policy.expiresAt <= Date.now()) {
    throw new ApiError(401, 'API key expired or revoked.');
  }
  await requireVerifiedEmail(policy.userId);
  const grant: Grant = {
    binderIds: JSON.parse(policy.binderIds),
    id: policy.id,
    name: policy.name,
    scopes: JSON.parse(policy.scopes),
    userId: policy.userId,
  };
  if (required && !grant.scopes.includes(required)) {
    throw new ApiError(403, `This key requires ${required}.`);
  }
  await db
    .update(agentKeyPolicy)
    .set({ lastUsedAt: Date.now() })
    .where(eq(agentKeyPolicy.id, grant.id));
  return grant;
}
export async function apiResponse<T>(c: CloudContext, action: () => Promise<T>) {
  c.header('Cache-Control', 'no-store');
  try {
    return c.json(await action());
  } catch (error) {
    if (error instanceof ApiError) {
      return c.json({ error: error.message }, error.status);
    }
    return c.json(
      { error: 'The request could not be completed. Retry with the same operation IDs.' },
      500,
    );
  }
}

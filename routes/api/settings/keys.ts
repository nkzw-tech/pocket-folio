import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { defineHandler } from 'void';
import { getAuth } from 'void/auth';
import { z } from 'zod';
import { agentKeyPolicy, binder } from '../../../db/schema';
import { primaryDb } from '../../../db/workspace';
import { ApiError, keyInput } from '../../../src/api/policy';
import { apiResponse, jsonBody, requireVerifiedEmail, sessionOwner } from '../../../src/api/server';
export const GET = defineHandler((c) =>
  apiResponse(c, async () => {
    const userId = sessionOwner(c);
    return {
      keys: await primaryDb()
        .select()
        .from(agentKeyPolicy)
        .where(eq(agentKeyPolicy.userId, userId))
        .orderBy(desc(agentKeyPolicy.createdAt))
        .limit(100),
    };
  }),
);
export const POST = defineHandler((c) =>
  apiResponse(c, async () => {
    const userId = sessionOwner(c, true);
    await requireVerifiedEmail(userId);
    const input = await jsonBody(c, keyInput, 10_000);
    const db = primaryDb();
    const active = await db
      .select({ id: agentKeyPolicy.id })
      .from(agentKeyPolicy)
      .where(
        and(
          eq(agentKeyPolicy.userId, userId),
          isNull(agentKeyPolicy.revokedAt),
          gt(agentKeyPolicy.expiresAt, Date.now()),
        ),
      );
    if (active.length >= 20) {
      throw new ApiError(400, 'Revoke an existing key before creating another.');
    }
    if (input.binderIds.length) {
      const binders = await db
        .select({ id: binder.id })
        .from(binder)
        .where(and(eq(binder.userId, userId), eq(binder.deleted, false)));
      if (input.binderIds.some((id) => !binders.some((b) => b.id === id))) {
        throw new ApiError(400, 'Choose binders from your collection.');
      }
    }
    const created = await getAuth(c).api.createApiKey({
      body: { expiresIn: input.expiresInDays * 86_400, name: input.name, userId },
    });
    await db.insert(agentKeyPolicy).values({
      binderIds: JSON.stringify(input.binderIds),
      createdAt: Date.now(),
      expiresAt: Date.now() + input.expiresInDays * 86_400_000,
      id: created.id,
      name: input.name,
      prefix: created.key.slice(0, 12),
      scopes: JSON.stringify([...new Set(input.scopes)]),
      userId,
    });
    return { id: created.id, key: created.key };
  }),
);
export const DELETE = defineHandler((c) =>
  apiResponse(c, async () => {
    const userId = sessionOwner(c, true);
    const { id } = await jsonBody(c, z.object({ id: z.string().min(1).max(200) }), 1000);
    const rows = await primaryDb()
      .update(agentKeyPolicy)
      .set({ revokedAt: Date.now() })
      .where(and(eq(agentKeyPolicy.userId, userId), eq(agentKeyPolicy.id, id)))
      .returning({ id: agentKeyPolicy.id });
    if (!rows.length) {
      throw new ApiError(404, 'Key not found.');
    }
    // Primary-read policy revocation is authoritative, even if plugin storage is replicated.
    return { revoked: true };
  }),
);

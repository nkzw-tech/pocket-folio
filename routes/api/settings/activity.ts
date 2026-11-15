import { desc, eq } from 'drizzle-orm';
import { defineHandler } from 'void';
import { agentChange } from '../../../db/schema';
import { primaryDb } from '../../../db/workspace';
import { apiResponse, sessionOwner } from '../../../src/api/server';
export const GET = defineHandler((c) =>
  apiResponse(c, async () => ({
    activity: await primaryDb()
      .select()
      .from(agentChange)
      .where(eq(agentChange.userId, sessionOwner(c)))
      .orderBy(desc(agentChange.createdAt))
      .limit(50),
  })),
);

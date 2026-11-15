import { defineHandler } from 'void';
import { z } from 'zod';
import { readWorkspace, syncWorkspace } from '../../../db/workspace';
import { authorizeCommands, collectionChanges, projectCollection } from '../../../src/api/policy';
import { apiResponse, authenticateKey, jsonBody } from '../../../src/api/server';
import { operationSchema } from '../../../src/app/model';
const input = z
  .object({
    dryRun: z.boolean().default(false),
    expectedRevision: z.number().int().min(0),
    operations: z.array(operationSchema).min(1).max(100),
  })
  .refine(({ operations }) => new Set(operations.map(({ id }) => id)).size === operations.length);
export const POST = defineHandler((c) =>
  apiResponse(c, async () => {
    const grant = await authenticateKey(c, 'collection:read');
    const body = await jsonBody(c, input);
    if (body.dryRun) {
      const state = await readWorkspace(
        grant.userId,
        grant.binderIds.length ? { binderIds: grant.binderIds } : undefined,
      );
      const next = authorizeCommands(
        state.document,
        body.operations.map(({ command }) => command),
        grant,
      );
      return {
        changes: collectionChanges(
          projectCollection(state.document, grant),
          projectCollection(next, grant),
        ),
        dryRun: true,
        revision: state.revision,
      };
    }
    const state = await syncWorkspace(grant.userId, body.operations, {
      expectedRevision: body.expectedRevision,
      grant,
    });
    return { ...state, document: projectCollection(state.document, grant) };
  }),
);

import { defineHandler } from 'void';
import { readWorkspace } from '../../../db/workspace';
import { projectCollection } from '../../../src/api/policy';
import { apiResponse, authenticateKey } from '../../../src/api/server';
export const GET = defineHandler((c) =>
  apiResponse(c, async () => {
    const grant = await authenticateKey(c, 'collection:read');
    const state = await readWorkspace(
      grant.userId,
      grant.binderIds.length ? { binderIds: grant.binderIds } : undefined,
    );
    return {
      accountId: grant.userId,
      document: projectCollection(state.document, grant),
      keyId: grant.id,
      revision: state.revision,
    };
  }),
);

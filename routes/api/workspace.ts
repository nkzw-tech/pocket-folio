import { defineHandler } from 'void';
import { getSession } from 'void/auth';
import { z } from 'zod';
import {
  readWorkspace,
  readWorkspaceDelta,
  readWorkspaceView,
  syncWorkspace,
} from '../../db/workspace';
import { ApiError } from '../../src/api/policy';
import { jsonBody } from '../../src/api/server';
import { operationSchema } from '../../src/app/model';
import { workspaceAccountChanged, workspaceAccountHeader } from '../../src/workspace-account';
const payload = z
  .object({
    hydrateBinderIds: z.array(z.uuid()).max(100).default([]),
    loadedBinderIds: z.array(z.uuid()).max(100).default([]),
    operations: z.array(operationSchema).min(1).max(100),
    since: z.number().int().min(0).optional(),
  })
  .refine(({ operations }) => new Set(operations.map(({ id }) => id)).size === operations.length);
export const GET = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const user = getSession()?.user;
  if (!user) {
    return c.json({ error: 'Sign in to open your binders.' }, 401);
  }
  const expectedUser = c.req.header(workspaceAccountHeader);
  if (expectedUser !== undefined && expectedUser !== user.id) {
    return c.json(
      { code: workspaceAccountChanged, error: 'Your account changed. Please reload.' },
      409,
    );
  }
  if (c.req.header('X-Workspace-View') === 'shelf') {
    const request = z
      .object({
        hydrateBinderIds: z.array(z.uuid()).max(100),
        loadedBinderIds: z.array(z.uuid()).max(100),
        since: z.number().int().min(-1),
      })
      .safeParse({
        hydrateBinderIds: (c.req.query('hydrate') ?? '').split(',').filter(Boolean),
        loadedBinderIds: (c.req.query('loaded') ?? '').split(',').filter(Boolean),
        since: Number(c.req.query('since') ?? -1),
      });
    if (!request.success) {
      return c.json({ error: 'Invalid collection request.' }, 400);
    }
    const { hydrateBinderIds, loadedBinderIds, since } = request.data;
    return {
      ...(await readWorkspaceView(user.id, since, loadedBinderIds, hydrateBinderIds)),
      userId: user.id,
    };
  }
  const since = c.req.query('since');
  if (since !== undefined && !z.coerce.number().int().min(0).safeParse(since).success) {
    return c.json({ error: 'Invalid revision.' }, 400);
  }
  return {
    ...(since === undefined
      ? await readWorkspace(user.id)
      : await readWorkspaceDelta(user.id, Number(since))),
    userId: user.id,
  };
});
export const POST = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const user = getSession()?.user;
  if (!user) {
    return c.json({ error: 'Sign in to sync your changes.' }, 401);
  }
  if (c.req.header('origin') !== new URL(c.req.url).origin) {
    return c.json({ error: 'Invalid request origin.' }, 403);
  }
  // Require an explicit account even for old clients: queued commands must
  // never be reassigned to whichever account now owns the browser cookie.
  if (c.req.header(workspaceAccountHeader) !== user.id) {
    return c.json(
      { code: workspaceAccountChanged, error: 'Your account changed. Please reload.' },
      409,
    );
  }
  let parsed;
  try {
    parsed = await jsonBody(c, payload, 16_000_000);
  } catch (error) {
    return c.json(
      { error: error instanceof ApiError ? error.message : 'Invalid collection change.' },
      error instanceof ApiError ? error.status : 400,
    );
  }
  try {
    const result = await syncWorkspace(user.id, parsed.operations);
    const state =
      c.req.header('X-Workspace-View') === 'shelf'
        ? await readWorkspaceView(
            user.id,
            parsed.since ?? -1,
            parsed.loadedBinderIds,
            parsed.hydrateBinderIds,
          )
        : parsed.since === undefined
          ? await readWorkspace(user.id)
          : await readWorkspaceDelta(user.id, parsed.since);
    return { ...state, acknowledged: result.acknowledged, userId: user.id };
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Could not sync changes.' },
      409,
    );
  }
});

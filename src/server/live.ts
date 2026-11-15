import { defineLiveStream } from 'void/live';

export const workspaceLive = defineLiveStream({
  id: 'workspace',
  onSubscribe({ owner, topic }) {
    if (!owner?.startsWith('user:') || topic !== `workspace:${owner.slice(5)}`) {
      return new Response('Forbidden', { status: 403 });
    }
  },
});

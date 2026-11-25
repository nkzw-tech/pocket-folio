import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Plus, Share2 } from 'lucide-react';
import { useState } from 'react';
import { text } from '../i18n/text';
import { BinderShelf } from './binder-shelf';
import { NewBinderDialog } from './new-binder';
import { ShareProfile } from './share-profile';
import { useWorkspace } from './workspace';

export function Library() {
  const { dispatch, document } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  return (
    <main className="shell library">
      <div className="library-heading">
        <div>
          <h1>{text('Your binders')}</h1>
        </div>
        <Stack direction="horizontal" gap={3} wrap="wrap">
          <Button
            icon={<Share2 size={16} />}
            label={text('Share profile')}
            onClick={() => setSharing(true)}
            type="button"
          />
          <Button
            className="primary-button"
            label={text('New binder')}
            onClick={() => setCreating(true)}
            type="button"
            variant="primary"
          >
            <Plus size={18} />
            {text('New binder')}
          </Button>
        </Stack>
      </div>
      <BinderShelf create={() => setCreating(true)} />
      {sharing && <ShareProfile close={() => setSharing(false)} />}
      {creating && (
        <NewBinderDialog
          close={() => setCreating(false)}
          dispatch={dispatch}
          ownership={document.ownership}
        />
      )}
    </main>
  );
}

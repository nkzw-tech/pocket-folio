import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { ToastViewport, useToast } from '@astryxdesign/core/Toast';
import { useEffect, useState } from 'react';
import { text } from '../i18n/text';

type Props = {
  discard: () => Promise<void>;
  error: string;
  pending: number;
  retry: () => Promise<void>;
  syncing: boolean;
};

export function SyncNotification(props: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);
  return visible ? (
    <ToastViewport>
      <SyncToast {...props} />
    </ToastViewport>
  ) : null;
}

function SyncToast({ discard, error, pending, retry, syncing }: Props) {
  const toast = useToast();
  const canDiscard = Boolean(error && pending);
  const message =
    error ||
    `${pending} · ${syncing ? text('Syncing…') : text('Changes are saved on this device. Sync will retry.')}`;
  useEffect(() => {
    toast({
      body: (
        <Stack className="sync-notification" gap={2}>
          <span>{message}</span>
          {error && (
            <Stack direction="horizontal" gap={2} wrap="wrap">
              <Button label={text('Retry')} onClick={() => void retry()} size="sm">
                {text('Retry')}
              </Button>
              {canDiscard && (
                <Button
                  label={text('Discard unsynced edits')}
                  onClick={() => {
                    if (
                      confirm(
                        text(
                          'Discard unsynced edits on this device and restore the server copy? Export a backup first if you want to keep them.',
                        ),
                      )
                    ) {
                      void discard();
                    }
                  }}
                  size="sm"
                >
                  {text('Discard unsynced edits')}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      ),
      isAutoHide: false,
      type: error ? 'error' : 'info',
      uniqueID: 'workspace-sync',
    });
  }, [canDiscard, discard, error, message, retry, toast]);
  return null;
}

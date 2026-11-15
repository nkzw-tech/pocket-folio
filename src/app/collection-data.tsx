import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Download, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { text } from '../i18n/text';
import { SyncStatus } from './library';
import { applyCommand, documentSchema, type CollectionDocument } from './model';
import { useWorkspace } from './workspace';

export function CollectionData() {
  const { completeDocument, dispatch, document } = useWorkspace();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<{ document: CollectionDocument; name: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const preview = useMemo(() => {
    if (!selection) {
      return;
    }
    try {
      const after = applyCommand(document, {
        document: selection.document,
        type: 'collection.import',
      });
      const added = after.binders.length - document.binders.length;
      const statuses = Object.entries(after.ownership).filter(
        ([id, status]) => status !== document.ownership[id],
      ).length;
      return { added, error: '', kept: selection.document.binders.length - added, statuses };
    } catch (error_) {
      return {
        added: 0,
        error:
          error_ instanceof Error ? text(error_.message) : text('Could not import collection.'),
        kept: 0,
        statuses: 0,
      };
    }
  }, [document, selection]);
  const download = async () => {
    const document = await completeDocument();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
    );
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = `card-binder-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const read = async (file: File) => {
    setBusy(true);
    setSelection(undefined);
    setNotice('');
    setError('');
    try {
      if (file.size > 20_000_000) {
        throw new Error(text('Choose a collection export smaller than 20 MB.'));
      }
      let value: unknown;
      try {
        value = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      } catch {
        throw new Error(
          text('This file is not valid JSON. Choose a Pocket Folio collection export.'),
        );
      }
      const result = documentSchema.safeParse(value);
      if (!result.success) {
        const issues = result.error.issues.flatMap((issue) => [
          issue,
          ...('issues' in issue ? issue.issues : []),
        ]);
        const unavailable = issues.some(
          ({ message }) => message === 'Unknown card printing' || message === 'Unknown set',
        );
        throw new Error(
          text(
            unavailable
              ? 'This backup includes cards or sets that are not available in this app.'
              : 'This file is not a supported collection export.',
          ),
        );
      }
      if (JSON.stringify(result.data).length > 8_000_000) {
        throw new Error(text('The combined collection is too large to import.'));
      }
      setSelection({ document: result.data, name: file.name });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : text('Could not read this file.'));
    } finally {
      setBusy(false);
    }
  };
  const importCollection = async () => {
    if (!selection || busy || !preview || preview.error || !(preview.added || preview.statuses)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await dispatch({ document: selection.document, type: 'collection.import' });
      setSelection(undefined);
      setNotice(text('Collection imported.'));
    } catch (error_) {
      setError(
        error_ instanceof Error ? text(error_.message) : text('Could not import collection.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="collection-data-title" className="settings-section collection-data">
      <h2 id="collection-data-title">{text('Collection data')}</h2>
      <p>{text('Move your binders and card statuses between Pocket Folio installations.')}</p>
      <Stack align="center" className="settings-fields" direction="horizontal" gap={4} wrap="wrap">
        <Button
          icon={<Download aria-hidden="true" size={16} />}
          label={text('Export collection')}
          onClick={download}
        />
        <Button
          icon={<Upload aria-hidden="true" size={16} />}
          isDisabled={busy}
          label={text('Import collection')}
          onClick={() => fileInput.current?.click()}
        />
      </Stack>
      <input
        accept=".json,application/json"
        aria-label={text('Choose collection file')}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) {
            void read(file);
          }
        }}
        ref={fileInput}
        type="file"
      />
      {selection && preview && (
        <div
          aria-label={text('Import preview')}
          className="collection-import-preview"
          role="region"
        >
          <h3>{text('Import preview')}</h3>
          <p className="collection-file-name">{selection.name}</p>
          {preview.error ? (
            <p role="alert">{preview.error}</p>
          ) : (
            <>
              <dl className="collection-import-counts">
                <div>
                  <dt>{text('New binders')}</dt>
                  <dd>{preview.added}</dd>
                </div>
                <div>
                  <dt>{text('Existing binders kept')}</dt>
                  <dd>{preview.kept}</dd>
                </div>
                <div>
                  <dt>{text('Card statuses updated')}</dt>
                  <dd>{preview.statuses}</dd>
                </div>
              </dl>
              {!!selection.document.binders.length && (
                <ul className="collection-import-binders">
                  {selection.document.binders.map((binder) => (
                    <li key={binder.id}>{binder.name}</li>
                  ))}
                </ul>
              )}
              <p>
                {text(
                  'Existing binders stay unchanged. Owned takes priority over purchased, then wishlist, then missing. Imported binders are private.',
                )}
              </p>
              {!preview.added && !preview.statuses && (
                <p role="status">{text('This collection is already up to date.')}</p>
              )}
            </>
          )}
          <Stack
            align="center"
            className="settings-fields"
            direction="horizontal"
            gap={4}
            wrap="wrap"
          >
            <Button
              isDisabled={busy}
              label={text('Cancel')}
              onClick={() => {
                setSelection(undefined);
                setError('');
              }}
            />
            <Button
              className="collection-import-confirm"
              isDisabled={busy || !!preview.error || !(preview.added || preview.statuses)}
              label={text('Confirm import')}
              onClick={() => void importCollection()}
              variant="primary"
            />
          </Stack>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <SyncStatus />
    </section>
  );
}

import { useParams } from '@void/react';
import { useEffect, useState } from 'react';
import { BinderView } from '../../src/app/binder-editor';
import { Loading } from '../../src/app/loading';
import { documentSchema, type CollectionDocument } from '../../src/app/model';
export default function SharedBinder() {
  const { token } = useParams();
  const [document, setDocument] = useState<CollectionDocument>();
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/shared/${token}`, { cache: 'no-store', signal: abort.signal })
      .then(async (response) => {
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error);
        }
        setDocument(documentSchema.parse(body));
      })
      .catch((error_) => {
        if (!abort.signal.aborted) {
          setError(String(error_));
        }
      });
    return () => abort.abort();
  }, [token]);
  if (error) {
    return (
      <main className="shell empty">
        <h1>Binder unavailable</h1>
        <p>{error}</p>
      </main>
    );
  }
  return document ? (
    <BinderView binder={document.binders[0]} ownership={document.ownership} />
  ) : (
    <Loading />
  );
}

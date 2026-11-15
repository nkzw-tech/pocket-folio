import { Link, useParams } from '@void/react';
import { binderCollections } from '../../src/binder-catalog';
import { CollectionBinder } from '../../src/collection-binder';
export default function SetPage() {
  const { id } = useParams();
  const collection = binderCollections.find((set) => set.id === id);
  return collection ? (
    <CollectionBinder collection={collection} key={id} />
  ) : (
    <main className="shell empty">
      <h1>Set not available yet</h1>
      <Link href="/sets">Browse available sets</Link>
    </main>
  );
}

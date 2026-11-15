import { Link, useParams, useShared } from '@void/react';
import { BinderEditor } from '../../src/app/binder-editor';
import type { Shared } from '../../src/app/workspace';
export default function BinderPage() {
  const { id } = useParams();
  const { user } = useShared<Shared>();
  return user ? (
    <BinderEditor id={id} />
  ) : (
    <main className="shell empty">
      <h1>Your binder awaits.</h1>
      <Link href="/login">Sign in to open it</Link>
    </main>
  );
}

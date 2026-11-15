import { BinderCover } from '../../../src/app/binder-cover';
import { text } from '../../../src/i18n/text';
import type { Props } from './index.server';

export default function PublicProfile({ profile, token }: Props) {
  return (
    <main className="shell library">
      <div className="library-heading">
        <h1>{profile?.name ?? text('Profile unavailable')}</h1>
      </div>
      {profile && (
        <div className="binder-shelf">
          {profile.binders.map((binder) => (
            <BinderCover
              binder={binder}
              href={`/p/${token}/${binder.id}?expanded=1`}
              key={binder.id}
            />
          ))}
        </div>
      )}
      {profile && !profile.binders.length && (
        <p className="muted">{text('No public binders yet.')}</p>
      )}
    </main>
  );
}

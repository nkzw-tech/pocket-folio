import { Link } from '@void/react';
import { BookOpen } from 'lucide-react';
import type { ComponentProps } from 'react';
import { binderCollections } from '../binder-catalog';
import { binderColorStyle } from '../binder-color';
import { text } from '../i18n/text';
import type { BinderSummary } from '../profile';
import { CardFan, SetCover } from '../set-cover';

export function BinderCover({
  binder,
  ...linkProps
}: {
  binder: BinderSummary;
} & Pick<ComponentProps<typeof Link>, 'aria-describedby' | 'href'>) {
  const coverSet = binderCollections.find((set) => set.id === binder.coverSetId);
  return (
    <Link {...linkProps} className="binder-book" style={binderColorStyle(binder.color)}>
      <div
        className={`binder-book-cover${coverSet || binder.images.length ? ' binder-book-set-cover' : ''}`}
      >
        <span className="binder-book-spine" />
        {coverSet ? (
          <SetCover set={coverSet} />
        ) : binder.images.length ? (
          <div aria-hidden="true" className="set-cover">
            <CardFan images={binder.images} />
          </div>
        ) : (
          <BookOpen size={25} strokeWidth={1} />
        )}
        <div className="binder-book-caption">
          <strong>{binder.name}</strong>
          <small>
            {binder.owned} / {binder.total} {text('owned')}
            {binder.purchased > 0 && ` · ${binder.purchased} ${text('Purchased')}`}
            {binder.wishlist > 0 && ` · ${binder.wishlist} ${text('Wishlist')}`}
          </small>
        </div>
      </div>
    </Link>
  );
}

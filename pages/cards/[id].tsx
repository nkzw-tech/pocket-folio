import { Link, useParams } from '@void/react';
import { cardsById } from '../../src/app/model';
import { BinderCardPreview } from '../../src/binder-card-preview';
import { text } from '../../src/i18n/text';

export default function CardPage() {
  const { id } = useParams();
  const card = cardsById.get(id);
  return card ? (
    <BinderCardPreview card={card} />
  ) : (
    <main className="shell empty">
      <h1>{text('No matching cards in the current catalog.')}</h1>
      <Link href="/cards">{text('Cards')}</Link>
    </main>
  );
}

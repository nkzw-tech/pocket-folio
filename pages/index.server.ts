import { defineHandler, defineHead, type InferProps } from 'void';
import { chooseCards } from '../src/home-card-selection';
export const loader = defineHandler(() => ({ cards: chooseCards().map(({ id }) => id) }));
export type Props = InferProps<typeof loader>;
export const head = defineHead(() => ({
  meta: [{ content: 'https://folio.nakazawa.tech/', property: 'og:url' }],
}));

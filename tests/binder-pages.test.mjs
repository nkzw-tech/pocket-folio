import assert from 'node:assert/strict';
import { test } from 'node:test';
import { binderPages, cardSpread, spreadCount } from '../src/binder-pages.ts';

const cards = (count) => Array.from({ length: count }, (_, index) => ({ id: String(index + 1) }));
const ids = (page) => page.cards.map((card) => card.id);

test('Grundset puts 1–9 in front, 10–18 behind, then starts the next sheet at 19', () => {
  const set = cards(102);
  const opening = binderPages(set, 0, true);
  assert.equal(opening.left.kind, 'inside');
  assert.deepEqual(ids(opening.right), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  const second = binderPages(set, 1, true);
  assert.equal(second.left.sheet, 1);
  assert.equal(second.left.kind, 'back');
  assert.deepEqual(ids(second.left), ['10', '11', '12', '13', '14', '15', '16', '17', '18']);
  assert.equal(second.right.sheet, 2);
  assert.equal(second.right.cards[0].id, '19');
  const last = binderPages(set, spreadCount(102, true) - 1, true);
  assert.deepEqual(ids(last.left), ['100', '101', '102']);
  assert.equal(last.right.kind, 'cover');
});

test('transparent single-sided sheets mirror columns on the reverse without duplicating collectible slots', () => {
  const second = binderPages(cards(64), 1, false);
  assert.equal(second.left.kind, 'reverse');
  assert.deepEqual(second.left.cards, []);
  assert.deepEqual(
    second.left.reverseCards.map((card) => card?.id),
    ['3', '2', '1', '6', '5', '4', '9', '8', '7'],
  );
  assert.equal(second.right.cards[0].id, '10');
});

test('every card is reachable exactly once, including partial sheets, secret rares and unnumbered VS cards', () => {
  for (const count of [1, 9, 10, 18, 19, 62, 64, 83, 102, 151]) {
    for (const doubleSided of [false, true]) {
      const set = cards(count);
      const seen = [];
      for (let index = 0; index < spreadCount(count, doubleSided); index++) {
        const { left, right } = binderPages(set, index, doubleSided);
        assert.ok(left.cards.length <= 9 && right.cards.length <= 9);
        seen.push(...ids(left), ...ids(right));
      }
      assert.deepEqual(
        seen,
        set.map((card) => card.id),
      );
      for (let index = 0; index < count; index++) {
        const { left, right } = binderPages(set, cardSpread(index, doubleSided), doubleSided);
        assert.ok([...left.cards, ...right.cards].some((card) => card.id === set[index].id));
      }
    }
  }
});

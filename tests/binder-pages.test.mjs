import assert from 'node:assert/strict';
import { test } from 'node:test';
import { binderPages, binderUnderlay, cardSpread, spreadCount } from '../src/binder-pages.ts';

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

test('single-sided stacks retain nearest visible backs across empty sheets and mirror each row', () => {
  const set = Array(45).fill(undefined);
  set[0] = { id: 'owned' };
  set[4] = { id: 'wishlist' };
  set[9] = { id: 'missing' };
  set[13] = { id: 'purchased' };
  const page = binderPages(set, 4, false).left;
  const stack = binderUnderlay(set, page, (card) => card.id !== 'missing');
  assert.equal(stack.length, 9);
  assert.deepEqual(stack[2], { card: set[0], depth: 3, slot: 0 });
  assert.deepEqual(stack[4], { card: set[13], depth: 2, slot: 13 });
  assert.equal(stack.filter(Boolean).length, 2);
  assert.equal(set[9].id, 'missing');
});

test('front stacks show through empty pockets but never through an assigned missing card', () => {
  const set = cards(68);
  set[0] = undefined;
  set[1] = undefined;
  const page = binderPages(set, 0, false).right;
  const stack = binderUnderlay(set, page, (card) => ['11', '20', '28', '68'].includes(card.id));
  assert.deepEqual(stack[0], { card: set[27], depth: 3, slot: 27 });
  assert.deepEqual(stack[1], { card: set[10], depth: 1, slot: 10 });
  assert.equal(stack[4], undefined);
  assert.equal(stack.filter(Boolean).length, 2);
});

test('underlays handle custom page sizes and never render through covers or double-sided backs', () => {
  const set = cards(13);
  const page = binderPages(set, 2, false, 2, 2).left;
  assert.deepEqual(
    binderUnderlay(set, page, () => true, 2, 2).map((entry) => entry?.slot),
    [1, 0, 3, 2],
  );
  for (const kind of ['cover', 'inside', 'back']) {
    assert.ok(binderUnderlay(set, { ...page, kind }, () => true).every((entry) => !entry));
  }
  assert.ok(binderUnderlay(set, page, () => false).every((entry) => !entry));
});

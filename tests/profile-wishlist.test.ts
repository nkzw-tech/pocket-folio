import { describe, expect, it } from 'vitest';
import { authorizeCommands, projectCollection, type Grant } from '../src/api/policy';
import {
  applyCommand,
  cardStatus,
  documentSchema,
  emptyDocument,
  makeBinder,
  type Command,
} from '../src/app/model';
import { profileSummary, profileBinderDocument } from '../src/profile';

const setup = () => {
  const visible = makeBinder('Public binder');
  visible.slots[0] = 'base1-1:first';
  visible.shareToken = crypto.randomUUID();
  const privateBinder = makeBinder('Secret binder');
  privateBinder.slots[0] = 'base5-83:first';
  const profile = { binderIds: [visible.id], name: 'Collector', token: crypto.randomUUID() };
  let doc = applyCommand(emptyDocument(), { binder: visible, type: 'binder.create' });
  doc = applyCommand(doc, { binder: privateBinder, type: 'binder.create' });
  doc = applyCommand(doc, {
    printing: 'base1-1:first',
    status: 'wishlist',
    type: 'ownership.status',
  });
  doc = applyCommand(doc, {
    printing: 'base5-83:first',
    status: 'purchased',
    type: 'ownership.status',
  });
  return {
    doc: applyCommand(doc, { profile, type: 'profile.settings' }),
    privateBinder,
    profile,
    visible,
  };
};
describe('wishlist and public profiles', () => {
  it('round trips wishlist and merges it below purchased/owned but above missing', () => {
    const { doc } = setup();
    expect(cardStatus(doc.ownership['base1-1:first'])).toBe('wishlist');
    const backup = JSON.stringify(doc);
    expect(documentSchema.parse(JSON.parse(backup))).toEqual(doc);
    const imported = applyCommand(emptyDocument(), { document: doc, type: 'collection.import' });
    expect(imported.ownership['base1-1:first']).toBe('wishlist');
    expect(imported.profile).toBeUndefined();
    expect(imported.binders.every((binder) => !binder.shareToken)).toBe(true);
    const purchased = applyCommand(doc, {
      printing: 'base1-1:first',
      status: 'purchased',
      type: 'ownership.status',
    });
    expect(
      applyCommand(purchased, { document: doc, type: 'collection.import' }).ownership[
        'base1-1:first'
      ],
    ).toBe('purchased');
    const received = applyCommand(purchased, {
      printing: 'base1-1:first',
      status: 'owned',
      type: 'ownership.status',
    });
    expect(
      applyCommand(received, { document: purchased, type: 'collection.import' }).ownership[
        'base1-1:first'
      ],
    ).toBe(true);
  });
  it('projects summaries only, and individual views expose only their selected binder', () => {
    const { doc, privateBinder, profile, visible } = setup();
    const summary = profileSummary(doc, profile.token)!;
    expect(summary.binders.map(({ id }) => id)).toEqual([visible.id]);
    expect(summary.binders[0]).toMatchObject({ owned: 0, total: 1, wishlist: 1 });
    expect(JSON.stringify(summary)).not.toContain(privateBinder.name);
    expect(JSON.stringify(summary)).not.toContain(visible.shareToken);
    expect(summary.binders[0]).not.toHaveProperty('slots');
    const view = profileBinderDocument(doc, profile.token, visible.id)!;
    expect(view.ownership).toEqual({ 'base1-1:first': 'wishlist' });
    expect(view.binders).toHaveLength(1);
    expect(view.binders[0].shareToken).toBeNull();
    expect(view.profile).toBeUndefined();
    expect(profileBinderDocument(doc, profile.token, privateBinder.id)).toBeNull();
    expect(profileSummary(doc, crypto.randomUUID())).toBeNull();
  });
  it('revokes profile views, prunes deleted binders, and preserves separate binder links', () => {
    const { doc, profile, visible } = setup();
    const revoked = applyCommand(doc, {
      profile: { ...profile, token: null },
      type: 'profile.settings',
    });
    expect(profileSummary(revoked, profile.token)).toBeNull();
    expect(profileBinderDocument(revoked, profile.token, visible.id)).toBeNull();
    expect(revoked.binders[0].shareToken).toBe(visible.shareToken);
    const deleted = applyCommand(doc, { binderId: visible.id, type: 'binder.delete' });
    expect(deleted.profile?.binderIds).toEqual([]);
    expect(() => applyCommand(deleted, { profile, type: 'profile.settings' })).toThrow(
      'no longer exists',
    );
  });
  it('requires account-wide sharing scope and does not leak profile configuration to restricted keys', () => {
    const { doc, profile, visible } = setup();
    const grant: Grant = {
      binderIds: [],
      id: 'key',
      name: 'Test',
      scopes: ['collection:read', 'binders:write'],
      userId: 'owner',
    };
    const command: Command = { profile, type: 'profile.settings' };
    expect(() => authorizeCommands(doc, [command], grant)).toThrow('sharing:write');
    const allowed: Grant = { ...grant, scopes: ['collection:read', 'sharing:write'] };
    expect(authorizeCommands(doc, [command], allowed).profile).toEqual(profile);
    const restricted = { ...allowed, binderIds: [visible.id] };
    expect(() => authorizeCommands(doc, [command], restricted)).toThrow('cannot change profile');
    expect(projectCollection(doc, restricted).profile).toBeUndefined();
  });
});

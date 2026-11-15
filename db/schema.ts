import { sql } from 'void/db';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'void/schema-d1';

const idColumn = () =>
  text()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());

const timestampColumn = () =>
  integer({ mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);
const nullableTimestampColumn = () => integer({ mode: 'timestamp' });

export const rsvpStatus = ['INVITED', 'GOING', 'INTERESTED', 'DECLINED'] as const;
export const eventType = ['WORKSHOP', 'MEETUP', 'AMA', 'LAUNCH', 'COMMUNITY_CALL'] as const;

export const user = sqliteTable(
  'user',
  {
    banExpires: nullableTimestampColumn(),
    banned: integer({ mode: 'boolean' }),
    banReason: text(),
    createdAt: timestampColumn(),
    displayUsername: text(),
    email: text().notNull(),
    emailVerified: integer({ mode: 'boolean' }).notNull().default(false),
    id: idColumn().primaryKey(),
    image: text(),
    name: text().notNull(),
    password: text(),
    role: text().notNull().default('user'),
    updatedAt: timestampColumn(),
    username: text(),
  },
  (table) => [
    uniqueIndex('user_email_key').on(table.email),
    uniqueIndex('user_username_key').on(table.username),
    index('user_id_idx').on(table.id),
  ],
);

export const session = sqliteTable(
  'session',
  {
    createdAt: timestampColumn(),
    expiresAt: integer({ mode: 'timestamp' }).notNull(),
    id: idColumn().primaryKey(),
    impersonatedBy: text(),
    ipAddress: text(),
    token: text().notNull(),
    updatedAt: timestampColumn(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_key').on(table.token),
    index('session_userId_idx').on(table.userId),
  ],
);

export const account = sqliteTable(
  'account',
  {
    accessToken: text(),
    accessTokenExpiresAt: nullableTimestampColumn(),
    accountId: text().notNull(),
    createdAt: timestampColumn(),
    id: idColumn().primaryKey(),
    idToken: text(),
    password: text(),
    providerId: text().notNull(),
    refreshToken: text(),
    refreshTokenExpiresAt: nullableTimestampColumn(),
    scope: text(),
    updatedAt: timestampColumn(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    createdAt: timestampColumn(),
    expiresAt: integer({ mode: 'timestamp' }).notNull(),
    id: idColumn().primaryKey(),
    identifier: text().notNull(),
    updatedAt: timestampColumn(),
    value: text().notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

// Account-wide revision coordinates atomic command batches, not collection storage.
export const workspaceRevision = sqliteTable('workspace_revision', {
  revision: integer().notNull().default(0),
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
});
export const binder = sqliteTable(
  'binder',
  {
    color: text(),
    columns: integer().notNull(),
    coverSetConfigured: integer({ mode: 'boolean' }).notNull(),
    coverSetId: text(),
    deleted: integer({ mode: 'boolean' }).notNull().default(false),
    doubleSided: integer({ mode: 'boolean' }).notNull(),
    id: text().notNull(),
    name: text().notNull(),
    pocketOpening: text(),
    position: integer().notNull(),
    presetSetId: text(),
    revision: integer().notNull(),
    rows: integer().notNull(),
    shareToken: text(),
    showAllCardsInColor: integer({ mode: 'boolean' }),
    slotCount: integer().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    uniqueIndex('binder_share_token').on(t.shareToken),
    index('binder_owner_revision').on(t.userId, t.revision),
    check('binder_layout', sql`${t.rows} between 2 and 4 and ${t.columns} between 2 and 4`),
    check('binder_capacity', sql`${t.slotCount} between 0 and 2000`),
  ],
);
export const binderPocket = sqliteTable(
  'binder_pocket',
  {
    binderId: text().notNull(),
    position: integer().notNull(),
    printingId: text().notNull(),
    userId: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.binderId, t.position] }),
    foreignKey({
      columns: [t.userId, t.binderId],
      foreignColumns: [binder.userId, binder.id],
    }).onDelete('cascade'),
    index('pocket_printing').on(t.userId, t.printingId),
    check('pocket_position', sql`${t.position} between 0 and 1999`),
  ],
);
export const cardOwnership = sqliteTable(
  'card_ownership',
  {
    printingId: text().notNull(),
    revision: integer().notNull(),
    status: text({ enum: ['missing', 'wishlist', 'purchased', 'owned'] }).notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.printingId] }),
    index('ownership_owner_revision').on(t.userId, t.revision),
    check('ownership_status', sql`${t.status} in ('missing', 'wishlist', 'purchased', 'owned')`),
  ],
);
export const collectionProfile = sqliteTable(
  'collection_profile',
  {
    name: text().notNull(),
    revision: integer().notNull(),
    token: text(),
    userId: text()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('profile_token').on(t.token)],
);
export const profileBinder = sqliteTable(
  'profile_binder',
  {
    binderId: text().notNull(),
    position: integer().notNull(),
    userId: text()
      .notNull()
      .references(() => collectionProfile.userId, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.binderId] }),
    foreignKey({
      columns: [t.userId, t.binderId],
      foreignColumns: [binder.userId, binder.id],
    }).onDelete('cascade'),
  ],
);
export const accountEmailBudget = sqliteTable('account_email_budget', {
  count: integer().notNull(),
  key: text().primaryKey(),
  lastSentAt: integer().notNull(),
  windowStartedAt: integer().notNull(),
});
export const operationReceipt = sqliteTable(
  'operation_receipt',
  {
    createdAt: timestampColumn(),
    id: text().primaryKey(),
    payloadHash: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('receipt_user_idx').on(t.userId)],
);
export const catalogCard = sqliteTable('catalog_card', {
  details: text().notNull(),
  id: text().primaryKey(),
  language: text().notNull(),
  metadata: text().notNull(),
  setId: text().notNull(),
});
export const printing = sqliteTable('printing', {
  cardId: text()
    .notNull()
    .references(() => catalogCard.id),
  edition: text().notNull(),
  finish: text().notNull(),
  id: text().primaryKey(),
});
export const agentKeyPolicy = sqliteTable(
  'agent_key_policy',
  {
    binderIds: text().notNull(),
    createdAt: integer().notNull(),
    expiresAt: integer().notNull(),
    id: text().primaryKey(),
    lastUsedAt: integer(),
    name: text().notNull(),
    prefix: text().notNull(),
    revokedAt: integer(),
    scopes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('agent_key_owner').on(t.userId)],
);
export const agentChange = sqliteTable(
  'agent_change',
  {
    changes: text().notNull(),
    createdAt: integer().notNull(),
    id: text().primaryKey(),
    keyId: text().notNull(),
    keyName: text().notNull(),
    revision: integer().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('agent_change_owner').on(t.userId)],
);
export default {
  account,
  accountEmailBudget,
  agentChange,
  agentKeyPolicy,
  binder,
  binderPocket,
  cardOwnership,
  catalogCard,
  collectionProfile,
  operationReceipt,
  printing,
  profileBinder,
  session,
  user,
  verification,
  workspaceRevision,
};

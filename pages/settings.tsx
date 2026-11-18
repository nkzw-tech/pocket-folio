import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Link, useRouter, useShared } from '@void/react';
import { useLocaleContext } from 'fbtee';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { scopes as apiScopes, type Scope } from '../src/api/policy';
import { AccountSecurity } from '../src/app/account-security';
import { AgentSetup } from '../src/app/agent-setup';
import { BinderAppearance } from '../src/app/binder-appearance';
import { CollectionData } from '../src/app/collection-data';
import { DeleteAccount } from '../src/app/delete-account';
import { cardsById, splitPrinting, statusLabel, cardStatus } from '../src/app/model';
import { useWorkspace, type Shared } from '../src/app/workspace';
import { CardLanguagePicker } from '../src/i18n/card-language';
import { LanguagePicker } from '../src/i18n/locale';
import { text } from '../src/i18n/text';
import { Select } from '../src/select';
import { Checkbox } from '../src/ui/fields';
import { FormStack } from '../src/ui/form-stack';
import '../src/app/settings.css';
const jsonString = z.string().transform((source, context) => {
  try {
    const value: unknown = JSON.parse(source);
    return value;
  } catch {
    context.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});
const keySchema = z.object({
  expiresAt: z.number(),
  id: z.string(),
  lastUsedAt: z.number().nullable(),
  name: z.string(),
  prefix: z.string(),
  revokedAt: z.number().nullable(),
  scopes: jsonString.pipe(z.array(z.enum(apiScopes))),
});
const statusValue = z.union([z.boolean(), z.enum(['purchased', 'wishlist'])]);
const activitySchema = z.object({
  changes: jsonString.pipe(
    z.object({
      binders: z.array(
        z.object({
          action: z.enum(['created', 'deleted', 'updated']),
          id: z.string(),
          name: z.string(),
        }),
      ),
      ownership: z.array(
        z.object({ after: statusValue, before: statusValue, printing: z.string() }),
      ),
      profile: z.object({}).optional(),
    }),
  ),
  createdAt: z.number(),
  id: z.string(),
  keyName: z.string(),
});
const keyList = z.object({ keys: z.array(keySchema) });
const activityList = z.object({ activity: z.array(activitySchema) });
const createdKey = z.object({ key: z.string().min(1) });
const revokedKey = z.object({ revoked: z.literal(true) });
const errorResponse = z.object({ error: z.string() });
const permissions: Array<[Scope, string]> = [
  ['collection:read', 'Read collection'],
  ['ownership:write', 'Change card status'],
  ['binders:write', 'Create and arrange binders'],
  ['binders:delete', 'Delete binders'],
  ['sharing:write', 'Manage share links'],
];
async function request<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...options, headers });
  const data: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      errorResponse.safeParse(data).data?.error ?? text('Could not complete the request.'),
    );
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(text('Could not complete the request.'));
  }
  return result.data;
}
export default function Settings() {
  const { user } = useShared<Shared>();
  const { url } = useRouter();
  const requestedTab = (
    typeof window === 'undefined' ? url : new URL(window.location.href)
  ).searchParams.get('tab');
  const initialTab = requestedTab === 'api' || requestedTab === 'account' ? requestedTab : 'app';
  const [tab, setTab] = useState(initialTab);
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([initialTab]));
  const selectTab = (value: string) => {
    setTab(value);
    setVisited((previous) => new Set([...previous, value]));
    // Keep tab changes local while preserving the selection across locale remounts.
    const next = new URL(window.location.href);
    next.searchParams.set('tab', value);
    history.replaceState(history.state, '', next);
  };
  return (
    <>
      <main className="shell settings">
        <div className="intro binder-intro">
          <div className="intro-copy">
            <h1>{text('Settings')}</h1>
          </div>
        </div>
        <TabList
          aria-label={text('Settings')}
          className="settings-tabs"
          hasDivider
          onChange={selectTab}
          role="tablist"
          value={tab}
        >
          {(['App', 'Account', 'API'] as const).map((label) => (
            <Tab
              id={`settings-tab-${label.toLowerCase()}`}
              key={label}
              label={text(label)}
              panelId={`settings-panel-${label.toLowerCase()}`}
              value={label.toLowerCase()}
            />
          ))}
        </TabList>
        <div
          aria-labelledby="settings-tab-app"
          hidden={tab !== 'app'}
          id="settings-panel-app"
          role="tabpanel"
        >
          <section className="settings-section">
            <h2>{text('Language')}</h2>
            <Stack
              align="stretch"
              className="settings-fields language-settings"
              direction="horizontal"
              gap={8}
              wrap="wrap"
            >
              <LanguagePicker />
              <CardLanguagePicker />
            </Stack>
          </section>
          <BinderAppearance />
        </div>
        <div
          aria-labelledby="settings-tab-account"
          hidden={tab !== 'account'}
          id="settings-panel-account"
          role="tabpanel"
        >
          {visited.has('account') &&
            (user ? (
              <>
                <AccountSecurity user={user} />
                <CollectionData />
                <DeleteAccount />
              </>
            ) : (
              <section className="settings-section">
                <Link href="/login">{text('Sign in')}</Link>
              </section>
            ))}
        </div>
        <div
          aria-labelledby="settings-tab-api"
          hidden={tab !== 'api'}
          id="settings-panel-api"
          role="tabpanel"
        >
          {visited.has('api') &&
            (user ? (
              <APISettings verified={user.emailVerified} verifyEmail={() => selectTab('account')} />
            ) : (
              <section className="settings-section">
                <Link href="/login">{text('Sign in to manage API keys')}</Link>
              </section>
            ))}
        </div>
      </main>
    </>
  );
}
function APISettings({ verified, verifyEmail }: { verified: boolean; verifyEmail: () => void }) {
  const { document } = useWorkspace();
  const { locale } = useLocaleContext();
  const [now, setNow] = useState(() => Date.now());
  const [keys, setKeys] = useState<z.infer<typeof keyList>['keys']>([]),
    [activity, setActivity] = useState<z.infer<typeof activityList>['activity']>([]);
  const [name, setName] = useState(''),
    [scopes, setScopes] = useState<Array<Scope>>(['collection:read', 'ownership:write']);
  const [binderId, setBinderId] = useState(''),
    [days, setDays] = useState('90');
  const [secret, setSecret] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const refresh = async () => {
    const [k, a] = await Promise.all([
      request('/api/settings/keys', keyList),
      request('/api/settings/activity', activityList),
    ]);
    setNow(Date.now());
    setKeys(k.keys);
    setActivity(a.activity);
  };
  useEffect(() => {
    void Promise.resolve()
      .then(refresh)
      .catch((error_: unknown) =>
        setError(error_ instanceof Error ? error_.message : text('Could not load settings.')),
      );
  }, []);
  async function create() {
    setBusy(true);
    setError('');
    setSecret('');
    setCopied(false);
    try {
      const data = await request('/api/settings/keys', createdKey, {
        body: JSON.stringify({
          binderIds: binderId ? [binderId] : [],
          expiresInDays: Number(days),
          name,
          scopes,
        }),
        method: 'POST',
      });
      setSecret(data.key);
      setName('');
      await refresh();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : text('Could not create key.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AgentSetup />
      <section className="settings-section">
        <h2>{text('API keys')}</h2>
        <p>{text('Let an agent update your binders with only the access you choose.')}</p>
        {!verified && (
          <Stack align="start" gap={4}>
            <p>{text('Verify your email before creating or using API keys.')}</p>
            <Button label={text('Verify your email')} onClick={verifyEmail} />
          </Stack>
        )}
        {verified && (
          <FormStack
            className="key-form"

            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <TextInput
              label={text('Key name')}
              onChange={setName}
              placeholder={text('My card assistant')}
              value={name}
            />
            <fieldset>
              <legend>{text('Permissions')}</legend>
              {permissions.map(([scope, label]) => (
                <Checkbox
                  isDisabled={scope === 'collection:read'}
                  key={scope}
                  label={text(label)}
                  onChange={(checked) =>
                    setScopes(checked ? [...scopes, scope] : scopes.filter((s) => s !== scope))
                  }
                  value={scopes.includes(scope)}
                />
              ))}
            </fieldset>
            <Stack
              align="center"
              className="settings-fields"
              direction="horizontal"
              gap={4}
              wrap="wrap"
            >
              <Select
                label={text('Binder access')}
                onChange={(e) => setBinderId(e)}
                value={binderId}
              >
                <option value="">{text('All my binders')}</option>
                {document.binders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <Select label={text('Expires after')} onChange={(e) => setDays(e)} value={days}>
                {[7, 30, 90, 365].map((d) => (
                  <option key={d} value={d}>
                    {d} {text('days')}
                  </option>
                ))}
              </Select>
            </Stack>
            <p>
              {text(
                'Card status is shared across binders. Restricting a key limits the cards it can change, but the same printing updates everywhere.',
              )}
            </p>
            <Button
              className="create-api-key"
              isDisabled={busy || !name.trim()}
              label={text('Create API key')}
              type="submit"
              variant="primary"
            />
          </FormStack>
        )}
        {secret && (
          <div className="key-secret">
            <h3>{text('Save your key now')}</h3>
            <p>
              {text(
                'This is the only time the full key is shown. Enter it in the CLI’s hidden prompt; don’t paste it into a chat or commit it.',
              )}
            </p>
            <TextInput isReadOnly label={text('New API key')} value={secret} />
            <Stack
              align="center"
              className="settings-fields"
              direction="horizontal"
              gap={4}
              wrap="wrap"
            >
              <Button
                label={copied ? text('Copied') : text('Copy key')}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(secret)
                    .then(() => setCopied(true))
                    .catch(() =>
                      setError(text('Could not copy. Select the key and copy it manually.')),
                    );
                }}
              />
              <Button label={text('Done')} onClick={() => setSecret('')} />
            </Stack>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="key-list">
          {keys.map((key) => (
            <article className="key-row" key={key.id}>
              <div>
                <strong>{key.name}</strong>
                <code>{key.prefix}…</code>
                <small>
                  {key.revokedAt
                    ? text('Revoked')
                    : key.expiresAt < now
                      ? text('Expired')
                      : text('Active')}{' '}
                  · {new Date(key.expiresAt).toLocaleDateString(locale)}
                  <br />
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleString(locale)
                    : text('Never used')}
                </small>
                <p>
                  {key.scopes
                    .map((scope) => text(permissions.find(([id]) => id === scope)?.[1] ?? scope))
                    .join(' · ')}
                </p>
              </div>
              {!key.revokedAt && (
                <Button
                  label={text('Revoke')}
                  onClick={() => {
                    void request('/api/settings/keys', revokedKey, {
                      body: JSON.stringify({ id: key.id }),
                      method: 'DELETE',
                    })
                      .then(refresh)
                      .catch((error_: unknown) =>
                        setError(
                          error_ instanceof Error ? error_.message : text('Could not revoke key.'),
                        ),
                      );
                  }}
                  size="sm"
                  variant="destructive"
                />
              )}
            </article>
          ))}
        </div>
        {!keys.length && <p>{text('No API keys yet.')}</p>}
      </section>
      <section className="settings-section">
        <Stack
          align="center"
          className="activity-heading"
          direction="horizontal"
          gap={4}
          wrap="wrap"
        >
          <h2>{text('Agent activity')}</h2>
          <Button
            icon={<RefreshCw aria-hidden="true" size={16} />}
            isIconOnly
            label={text('Refresh')}
            onClick={() => {
              void Promise.resolve()
                .then(refresh)
                .catch((error_: unknown) =>
                  setError(
                    error_ instanceof Error ? error_.message : text('Could not load activity.'),
                  ),
                );
            }}
            size="sm"
          />
        </Stack>
        {!activity.length && <p>{text('No agent changes yet.')}</p>}
        {activity.map((entry) => {
          const { changes } = entry;
          return (
            <details className="activity-row" key={entry.id}>
              <summary>
                {entry.keyName} · {new Date(entry.createdAt).toLocaleString(locale)}
                <small>
                  {changes.ownership.length} {text('card changes ·')} {changes.binders.length}{' '}
                  {text('binder changes')}
                  {changes.profile && ` · ${text('Profile sharing updated')}`}
                </small>
              </summary>
              <ul>
                {changes.ownership.map((change) => (
                  <li key={change.printing}>
                    {splitPrinting(change.printing).card?.localName ??
                      cardsById.get(change.printing)?.localName ??
                      change.printing}
                    : {text(statusLabel(cardStatus(change.before)))} →{' '}
                    {text(statusLabel(cardStatus(change.after)))}
                  </li>
                ))}
                {changes.binders.map((change) => (
                  <li key={change.id}>
                    {change.name}: {text(change.action)}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
    </>
  );
}

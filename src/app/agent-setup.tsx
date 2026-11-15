import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Link, useRouter } from '@void/react';
import { useState, useSyncExternalStore } from 'react';
import { text } from '../i18n/text';
import { Select } from '../select';
import './agent-setup.css';

const subscribe = () => () => {};

function CopyCommand({ label, ready, value }: { label: string; ready: boolean; value: string }) {
  const [copied, setCopied] = useState('');
  const [error, setError] = useState(false);
  return (
    <Stack gap={2}>
      <Stack align="center" className="agent-command" direction="horizontal" gap={3}>
        <code>{value}</code>
        <Button
          isDisabled={!ready}
          label={copied === value ? text('Copied') : label}
          onClick={() => {
            void navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopied(value);
                setError(false);
              })
              .catch(() => setError(true));
          }}
          size="sm"
        />
      </Stack>
      {error && <p role="alert">{text('Could not copy. Select the text and copy it manually.')}</p>}
    </Stack>
  );
}

export function AgentSetup({ guide = false }: { guide?: boolean }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [agent, setAgent] = useState('codex');
  const { url } = useRouter();
  const origin = url.origin;
  const quotedOrigin = `'${origin.replaceAll("'", String.raw`'\''`)}'`;
  const prompt = `${text('Use Pocket Folio at')} ${origin}. ${text('Show my binders and the cards I still need.')}`;
  return (
    <section className="settings-section agent-setup">
      {!guide && <h2>{text('Connect your agent')}</h2>}
      <Stack gap={6}>
        <p>
          {text(
            'Use a local terminal agent with Node.js 24 or newer. Your API key stays in your OS credential store.',
          )}
        </p>
        <Stack gap={3}>
          <h3>{text('1. Install the CLI and skill')}</h3>
          <CopyCommand
            label={text('Copy install command')}
            ready={ready}
            value="npm install -g @nkzw/pocket-folio"
          />
          <Select disabled={!ready} label={text('Agent')} onChange={setAgent} value={agent}>
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
          </Select>
          <CopyCommand
            label={text('Copy skill command')}
            ready={ready}
            value={`pocket-folio skill install --agent ${agent}`}
          />
        </Stack>
        <Stack gap={3}>
          <h3>{text('2. Connect your account')}</h3>
          <p>
            {text(
              'Create a key with the access you need, then paste it into the terminal’s hidden prompt.',
            )}
          </p>
          {guide && <Link href="/settings?tab=api">{text('Create API key')}</Link>}
          <CopyCommand
            label={text('Copy login command')}
            ready={ready}
            value={`pocket-folio auth login --origin ${quotedOrigin}`}
          />
          <p>
            {text(
              'macOS needs Command Line Tools. Linux needs Secret Service and secret-tool. Windows is not supported yet.',
            )}
          </p>
        </Stack>
        <Stack gap={3}>
          <h3>{text('3. Start a new agent session')}</h3>
          <CopyCommand label={text('Copy example request')} ready={ready} value={prompt} />
          <p>
            {text(
              'Ask it to mark cards as purchased when ordered, or owned when they arrive. Review agent changes in Settings → API.',
            )}
          </p>
        </Stack>
        <Stack direction="horizontal" gap={4} wrap="wrap">
          {!guide && <Link href="/agents">{text('Setup guide')}</Link>}
          <a href="/agent/SKILL.md">{text('Agent skill')}</a>
          <a href="/agent/references/api.md">{text('API reference')}</a>
        </Stack>
      </Stack>
    </section>
  );
}

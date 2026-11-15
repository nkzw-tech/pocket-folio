import { AgentSetup } from '../src/app/agent-setup';
import { text } from '../src/i18n/text';
import '../src/app/settings.css';

export default function Agents() {
  return (
    <main className="shell settings">
      <div className="intro binder-intro">
        <div className="intro-copy">
          <h1>{text('Connect your agent')}</h1>
        </div>
      </div>
      <AgentSetup guide />
    </main>
  );
}

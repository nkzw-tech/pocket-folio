import { Check, ChevronDown, Heart, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { text } from '../i18n/text';
import { Select } from '../select';
import { cardStatuses, statusLabel, type CardStatus } from './model';

export function CardStatusControl({
  compact = false,
  name,
  onChange,
  status,
}: {
  compact?: boolean;
  name: string;
  onChange?: (status: CardStatus) => Promise<void>;
  status: CardStatus;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const Icon =
    status === 'owned'
      ? Check
      : status === 'purchased'
        ? Package
        : status === 'wishlist'
          ? Heart
          : onChange
            ? Plus
            : null;
  if (compact && !Icon) {
    return null;
  }
  const change = async (next: string) => {
    setPending(true);
    setError(false);
    try {
      await onChange?.(next as CardStatus);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };
  if (!compact && onChange) {
    return (
      <div className="card-status-field" data-status={status}>
        <Select
          aria-label={`Status of ${name}`}
          disabled={pending}
          onChange={(value) => void change(value)}
          startIcon={Icon ? <Icon size={16} /> : undefined}
          value={status}
        >
          {cardStatuses.map((value) => (
            <option key={value} value={value}>
              {text(statusLabel(value))}
            </option>
          ))}
        </Select>
        {error && <span role="alert">{text('Couldn’t save. Try again.')}</span>}
      </div>
    );
  }
  return (
    <span className={`card-status${compact ? ' card-status-compact' : ''}`} data-status={status}>
      {Icon && <Icon aria-hidden="true" size={compact ? 12 : 14} />}
      <span className="card-status-label">{text(statusLabel(status))}</span>
      {onChange && (
        <>
          {!compact && <ChevronDown aria-hidden="true" size={12} />}
          <select
            aria-label={`Status of ${name}`}
            disabled={pending}
            onChange={async (event) => {
              const next = event.target.value as CardStatus;
              setPending(true);
              setError(false);
              try {
                await onChange(next);
              } catch {
                setError(true);
              } finally {
                setPending(false);
              }
            }}
            value={status}
          >
            {cardStatuses.map((value) => (
              <option key={value} value={value}>
                {text(statusLabel(value))}
              </option>
            ))}
          </select>
        </>
      )}
      {error && (
        <span className="card-status-error" role="alert">
          {text('Couldn’t save. Try again.')}
        </span>
      )}
    </span>
  );
}

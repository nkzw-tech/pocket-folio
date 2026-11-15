import { Switch } from '@astryxdesign/core/Switch';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { text } from './i18n/text';

const Context = createContext<{
  setShowOwnership: (value: boolean) => void;
  showOwnership: boolean;
} | null>(null);

// A browsing mode, scoped to this mounted account rather than saved preferences.
export function CatalogOwnershipProvider({ children }: { children: ReactNode }) {
  const [showOwnership, setShowOwnership] = useState(false);
  return <Context value={{ setShowOwnership, showOwnership }}>{children}</Context>;
}

export function useCatalogOwnership() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('Catalog ownership requires its provider.');
  }
  return context;
}

export function CatalogOwnershipToggle({ children }: { children?: ReactNode }) {
  const { setShowOwnership, showOwnership } = useCatalogOwnership();
  return (
    <div className="catalog-ownership-control">
      {children}
      <Switch label={text('Show ownership')} onChange={setShowOwnership} value={showOwnership} />
    </div>
  );
}

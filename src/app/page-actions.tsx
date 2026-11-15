import { Button } from '@astryxdesign/core/Button';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { text } from '../i18n/text';

export function PageActions({
  add,
  canRemove,
  remove,
}: {
  add: () => Promise<void>;
  canRemove: boolean;
  remove: () => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="binder-page-actions">
      <>
        <DropdownMenu
          alignment="end"
          className="binder-page-menu"
          items={[
            {
              icon: Plus,
              isDisabled: pending,
              label: text('Add page'),
              onClick: () => {
                if (pending) {
                  return;
                }
                setPending(true);
                void add()
                  .catch(() => {})
                  .finally(() => setPending(false));
              },
            },
            {
              icon: Trash2,
              isDisabled: !canRemove || pending,
              label: text('Remove page'),
              onClick: remove,
            },
          ]}
          menuWidth={180}
          presentation="popover"
          renderTrigger={(props) => (
            <Button label={text('Pages')} {...props} className="binder-pages-trigger" type="button">
              {text('Pages')}
              <ChevronDown aria-hidden="true" size={14} />
            </Button>
          )}
        />
      </>
    </div>
  );
}

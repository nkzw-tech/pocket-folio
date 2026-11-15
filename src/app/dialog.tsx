import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Stack } from '@astryxdesign/core/Stack';
import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { text } from '../i18n/text';
export function Dialog({
  children,
  close,
  title,
  toolbar,
  wide = false,
}: {
  children: ReactNode;
  close: () => void;
  title: string;
  toolbar?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  return (
    <AstryxDialog
      aria-labelledby={titleId}
      className={`app-dialog${wide ? ' app-dialog-wide' : ''}`}
      isOpen
      maxHeight="90dvh"
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
      padding={0}
      purpose="info"
      width={wide ? 'min(920px, calc(100% - 32px))' : 'min(480px, calc(100% - 32px))'}
    >
      <Stack
        className="app-dialog-content"
        gap={6}
        isScrollable={!toolbar}
        minHeight={0}
        padding={6}
      >
        <Stack align="center" as="header" direction="horizontal" gap={4} justify="between">
          <h2 id={titleId}>{title}</h2>
          <IconButton
            className="control-icon"
            icon={<X size={20} />}
            label={text('Close dialog')}
            onClick={close}
            variant="ghost"
          />
        </Stack>
        {toolbar}
        {toolbar ? (
          <Stack className="app-dialog-body" gap={6} isScrollable minHeight={0}>
            {children}
          </Stack>
        ) : (
          children
        )}
      </Stack>
    </AstryxDialog>
  );
}

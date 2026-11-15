import { Button } from '@astryxdesign/core/Button';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { CardFoil } from './binder-catalog';
import { CardScan, cardLightEvents } from './card-scan';
import { text } from './i18n/text';

export function CardPreview({
  children,
  className = '',
  close,
  foil,
  image,
  imageActions,
  title,
}: {
  children: ReactNode;
  className?: string;
  close: () => void;
  foil?: CardFoil;
  image: string;
  imageActions?: ReactNode;
  title: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const scan = (
    <div className="preview-scan" {...cardLightEvents}>
      <CardScan foil={foil} image={image} />
    </div>
  );

  return (
    <dialog
      aria-labelledby="preview-title"
      className={`card-preview ${className}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dialog.current?.close();
        }
      }}
      onClose={close}
      ref={dialog}
    >
      <div className="preview-content">
        <Button
          aria-label={text('Close image')}
          className="icon-button"
          icon={
            <>
              <X aria-hidden="true" size={20} />
            </>
          }
          isIconOnly
          label={text('Close image')}
          onClick={() => dialog.current?.close()}
          type="button"
        ></Button>
        {imageActions ? (
          <div className="preview-card">
            {scan}
            <div className="preview-card-actions">{imageActions}</div>
          </div>
        ) : (
          scan
        )}
        <h2 id="preview-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

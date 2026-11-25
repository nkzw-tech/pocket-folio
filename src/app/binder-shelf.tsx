import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { text } from '../i18n/text';
import type { BinderSummary } from '../profile';
import { BinderCover } from './binder-cover';
import { useWorkspace } from './workspace';

function SortableBinder({ binder, disabled }: { binder: BinderSummary; disabled: boolean }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    disabled,
    id: binder.id,
  });
  return (
    <div
      {...listeners}
      className="shelf-binder"
      data-dragging={isDragging || undefined}
      onDragStart={(event) => event.preventDefault()}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <BinderCover
        aria-describedby={disabled ? undefined : attributes['aria-describedby']}
        binder={binder}
        href={`/binders/${binder.id}`}
      />
    </div>
  );
}

export function BinderShelf({ create }: { create: () => void }) {
  const { dispatch, summaries } = useWorkspace();
  const [error, setError] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { cancel: ['Escape'], end: ['Space', 'Enter', 'Tab'], start: ['Space'] },
    }),
  );
  const ids = summaries.map(({ id }) => id);
  const announce = (id: UniqueIdentifier, target = id) => {
    const binder = summaries.find((b) => b.id === id);
    const position = ids.indexOf(String(target));
    return binder && position >= 0 ? `${binder.name} · ${position + 1} / ${ids.length}` : undefined;
  };
  return (
    <DndContext
      accessibility={{
        announcements: {
          onDragCancel: () => text('Cancelled'),
          onDragEnd: ({ active, over }) =>
            over ? announce(active.id, over.id) : text('Cancelled'),
          onDragOver: ({ active, over }) => (over ? announce(active.id, over.id) : undefined),
          onDragStart: ({ active }) => announce(active.id),
        },
        screenReaderInstructions: {
          draggable: text(
            'Press Space to pick up a binder, use the arrow keys to move it, then press Space to drop or Escape to cancel.',
          ),
        },
      }}
      onDragEnd={async ({ active, over }) => {
        if (!over || active.id === over.id) {
          return;
        }
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from < 0 || to < 0) {
          return;
        }
        try {
          setError(false);
          await dispatch({
            beforeId: ids[from < to ? to + 1 : to] ?? null,
            binderId: ids[from],
            type: 'shelf.move',
          });
        } catch {
          setError(true);
        }
      }}
      sensors={sensors}
    >
      {error && <p role="alert">{text('Couldn’t save. Try again.')}</p>}
      <div className="binder-shelf">
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {summaries.map((binder) => (
            <SortableBinder binder={binder} disabled={ids.length < 2} key={binder.id} />
          ))}
        </SortableContext>
        <button className="new-binder-card" onClick={create} type="button">
          <Plus size={30} strokeWidth={1} />
          <span>{text('New binder')}</span>
        </button>
      </div>
    </DndContext>
  );
}

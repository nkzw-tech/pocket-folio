import { BookOpen } from 'lucide-react';
import { useId, useState } from 'react';
import { binderColorStyle, defaultBinderColor } from '../binder-color';
import { text } from '../i18n/text';
import './binder-color-picker.css';

const colors = [
  ['Charcoal', defaultBinderColor],
  ['Silver', '#a4a9b2'],
  ['Cream', '#dccbad'],
  ['Gold', '#c39a47'],
  ['Terracotta', '#b66d52'],
  ['Red', '#9b3848'],
  ['Pink', '#bc7296'],
  ['Lavender', '#a394c4'],
  ['Purple', '#705091'],
  ['Blue', '#315e91'],
  ['Navy', '#293c60'],
  ['Teal', '#397f82'],
] as const;

export function BinderColorPicker({ value = defaultBinderColor }: { value?: string }) {
  const [color, setColor] = useState(value);
  const name = useId();
  return (
    <fieldset className="binder-color-picker">
      <legend>{text('Binder color')}</legend>
      <div className="binder-color-controls">
        <div className="binder-color-swatches">
          {colors.map(([label, value]) => (
            <input
              aria-label={text(label)}
              checked={color.toLowerCase() === value}
              key={value}
              name={name}
              onChange={() => setColor(value)}
              style={{ backgroundColor: value }}
              type="radio"
              value={value}
            />
          ))}
        </div>
        <label className="binder-custom-color">
          <input
            name="color"
            onChange={(event) => setColor(event.target.value)}
            type="color"
            value={color}
          />
          {text('Custom color')}
        </label>
      </div>
      <div
        aria-hidden="true"
        className="binder-book-cover binder-color-preview"
        style={binderColorStyle(color)}
      >
        <span className="binder-book-spine" />
        <BookOpen size={22} strokeWidth={1} />
      </div>
    </fieldset>
  );
}

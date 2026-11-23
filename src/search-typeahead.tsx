import { InputClearButton } from '@astryxdesign/core/Field';
import Typeahead, { type TypeaheadControls, type TypeaheadProps } from '@nkzw/typeahead';
import { Search } from 'lucide-react';
import { useRef } from 'react';
import { text } from './i18n/text';
import './card-search.css';

export function SearchTypeahead<T>(props: TypeaheadProps<T>) {
  const controls = useRef<TypeaheadControls>(null);
  return (
    <Typeahead
      {...props}
      controlsRef={controls}
      renderInput={(input) => (
        <div
          className="search"
          data-clearable={(Boolean(input.value) && !input.disabled) || undefined}
        >
          <Search aria-hidden="true" size={18} />
          <input {...input} />
          <InputClearButton
            label={text('Clear search')}
            onClick={() => {
              controls.current?.focus();
              controls.current?.clear();
            }}
          />
        </div>
      )}
    />
  );
}

import { CheckboxInput, type CheckboxInputProps } from '@astryxdesign/core/CheckboxInput';
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';
import { useState } from 'react';

// Astryx uses controlled fields. These wrappers also support initial values for
// the app's native FormData submissions, without manufacturing DOM events.
export function TextField({
  defaultValue = '',
  onChange,
  value,
  ...props
}: Omit<TextInputProps, 'value'> & {
  defaultValue?: string;
  maxLength?: number;
  minLength?: number;
  value?: string;
}) {
  const [local, setLocal] = useState(defaultValue);
  return (
    <TextInput
      {...props}
      {...{ disabled: props.isDisabled, required: props.isRequired }}
      onChange={(next, event) => {
        setLocal(next);
        onChange?.(next, event);
      }}
      value={value ?? local}
    />
  );
}

export function Checkbox({
  defaultValue = false,
  onChange,
  value,
  ...props
}: Omit<CheckboxInputProps, 'value'> & { defaultValue?: boolean; value?: boolean }) {
  const [local, setLocal] = useState(defaultValue);
  return (
    <CheckboxInput
      {...props}
      onChange={(next, event) => {
        setLocal(next);
        onChange?.(next, event);
      }}
      value={value ?? local}
    />
  );
}

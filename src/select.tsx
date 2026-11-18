import {
  Selector,
  type SelectorOptionData,
  type SelectorOptionType,
} from '@astryxdesign/core/Selector';
import { Children, isValidElement, useState, type ReactNode } from 'react';
import './select.css';

function optionText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join('');
}
function optionsFromChildren(children: ReactNode): Array<SelectorOptionType> {
  return Children.toArray(children).flatMap((child): Array<SelectorOptionType> => {
    if (
      !isValidElement<{
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
        value?: string | number;
      }>(child)
    ) {
      return [];
    }
    if (child.type === 'option') {
      return [
        {
          disabled: child.props.disabled,
          label: optionText(child.props.children),
          value: String(child.props.value ?? optionText(child.props.children)),
        },
      ];
    }
    if (child.type === 'optgroup') {
      return [
        {
          options: optionsFromChildren(child.props.children) as Array<SelectorOptionData>,
          title: child.props.label,
          type: 'section',
        },
      ];
    }
    return optionsFromChildren(child.props.children);
  });
}

export function Select({
  'aria-label': ariaLabel,
  children,
  className = '',
  clearTo,
  defaultValue = '',
  disabled,
  label,
  name,
  onChange,
  size,
  startIcon,
  value,
}: {
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
  clearTo?: string;
  defaultValue?: string | number;
  disabled?: boolean;
  label?: string;
  name?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  startIcon?: ReactNode;
  value?: string | number;
}) {
  const [local, setLocal] = useState(String(defaultValue));
  const selected = String(value ?? local);
  return (
    <div
      className={`select-field ${className}`}
      data-at-default={clearTo === selected || undefined}
      data-name={name}
      data-value={selected}
    >
      <Selector
        aria-label={ariaLabel}
        hasClear={clearTo !== undefined}
        hasSearch={false}
        htmlName={name}
        isDisabled={disabled}
        isLabelHidden={!label}
        label={label ?? ariaLabel ?? ''}
        onChange={(next: string | null) => {
          const selection = next ?? clearTo ?? '';
          if (selection !== selected) {
            setLocal(selection);
            onChange?.(selection);
          }
        }}
        options={optionsFromChildren(children)}
        renderOption={(option) => <span data-value={option.value}>{option.label}</span>}
        size={size}
        startIcon={startIcon}
        value={selected}
        width="100%"
      />
    </div>
  );
}

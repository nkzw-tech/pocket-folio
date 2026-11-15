import { FormLayout, type FormLayoutProps } from '@astryxdesign/core/FormLayout';
import type { ComponentProps } from 'react';

export function FormStack({
  children,
  defaultOptionality,
  ...props
}: ComponentProps<'form'> & Pick<FormLayoutProps, 'defaultOptionality'>) {
  return (
    <form {...props}>
      <FormLayout className="form-fields" defaultOptionality={defaultOptionality}>
        {children}
      </FormLayout>
    </form>
  );
}

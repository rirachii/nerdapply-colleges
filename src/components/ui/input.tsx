// Adapted from coss ui's native Input variant (MIT); CSS replaces Tailwind.
import type { ComponentPropsWithRef } from 'react';
export function Input({ className = '', ...props }: ComponentPropsWithRef<'input'>) {
  return (
    <span className={`input-control ${className}`} data-slot="input-control">
      <input data-slot="input" {...props} />
    </span>
  );
}
export function Textarea({ className = '', ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea className={`ui-textarea ${className}`} data-slot="textarea" {...props} />;
}

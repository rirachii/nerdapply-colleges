// Adapted from coss ui's MIT-licensed Button. See public/third-party-notices.txt.
// The source-owned Base UI composition is retained; styling uses our CSS tokens.
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { LoaderCircle } from 'lucide-react';

interface ButtonProps extends useRender.ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}
export function Button({
  className = '',
  variant = 'secondary',
  render,
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>(
      {
        type: render ? undefined : 'button',
        disabled: loading || disabled,
        'aria-busy': loading || undefined,
        className: `button ${variant} ${className}`,
        children: (
          <>
            {loading && <LoaderCircle className="spin" size={16} aria-hidden="true" />}
            {children}
          </>
        ),
      },
      props,
    ),
  });
}

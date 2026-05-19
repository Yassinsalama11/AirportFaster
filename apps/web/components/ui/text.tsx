import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('', {
  variants: {
    size: {
      'display-2xl': 'text-display-2xl',
      'display-xl': 'text-display-xl',
      'display-lg': 'text-display-lg',
      'display-md': 'text-display-md',
      'display-sm': 'text-display-sm',
      'body-xl': 'text-body-xl',
      'body-lg': 'text-body-lg',
      'body-md': 'text-body-md',
      'body-sm': 'text-body-sm',
      caption: 'text-caption',
      overline: 'text-overline uppercase tracking-widest',
    },
    textColor: {
      default: 'text-brand-off-white',
      muted: 'text-brand-muted',
      gold: 'text-brand-gold',
      white: 'text-white',
    },
  },
  defaultVariants: {
    size: 'body-md',
    textColor: 'default',
  },
});

type TextTag = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'bdi';

// Omit 'color' from HTMLAttributes to avoid conflict with CVA variant
type TextBaseProps = Omit<React.HTMLAttributes<HTMLElement>, 'color'>;

interface TextProps extends TextBaseProps, VariantProps<typeof textVariants> {
  as?: TextTag;
  /** Force a text direction — prevents bidi punctuation issues in RTL pages */
  dir?: 'ltr' | 'rtl' | 'auto';
}

/**
 * Polymorphic text component with RTL bidi support.
 * Use `dir="ltr"` for English-only content inside an RTL page to prevent leading-period artefacts.
 */
function Text({ as: Tag = 'p', className, size, textColor, dir, children, ...props }: TextProps) {
  return (
    <Tag
      dir={dir}
      className={cn(textVariants({ size, textColor }), className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
Text.displayName = 'Text';

export { Text, textVariants };
export type { TextProps };

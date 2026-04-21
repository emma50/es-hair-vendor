import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'whatsapp'
  | 'ghost'
  | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

/**
 * Variant styles — layered look:
 *   - gradient backgrounds for depth instead of flat fills
 *   - ring-based hover elevation so transitions stay smooth
 *   - inset highlight (`before:` pseudo) on primary for a polished "lit"
 *     top edge that reads as a soft bevel
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'relative overflow-hidden',
    'bg-gradient-to-b from-gold-light via-gold to-gold-dark text-midnight',
    'shadow-[0_8px_24px_-8px_rgba(212,168,83,0.5),inset_0_1px_0_0_rgba(255,255,255,0.35)]',
    'hover:shadow-[0_14px_32px_-8px_rgba(212,168,83,0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)]',
    'hover:from-gold hover:via-gold hover:to-gold-dark',
    'active:translate-y-px',
  ].join(' '),
  secondary: [
    'border border-gold/40 bg-gold/5 text-gold backdrop-blur-sm',
    'hover:border-gold hover:bg-gold/10 hover:shadow-glow-sm',
  ].join(' '),
  whatsapp: [
    'bg-whatsapp text-white',
    'shadow-[0_8px_24px_-8px_rgba(37,211,102,0.45),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
    'hover:bg-whatsapp/90 hover:shadow-[0_14px_32px_-8px_rgba(37,211,102,0.55)]',
    'active:translate-y-px',
  ].join(' '),
  ghost: 'text-pearl hover:bg-charcoal/80 hover:text-ivory',
  destructive: 'bg-error text-white hover:bg-error/90 shadow-md',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-6 text-[0.8rem]',
  lg: 'h-[52px] px-9 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base layout
          'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold tracking-[0.14em] whitespace-nowrap uppercase',
          // Motion — spring-ish easing that feels premium
          'transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          // A11y min target
          'min-h-[44px]',
          // States
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
          'focus-visible:ring-gold/40 focus-visible:ring-offset-midnight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Spinner className="h-4 w-4" />}
        <span className="relative z-10 inline-flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';

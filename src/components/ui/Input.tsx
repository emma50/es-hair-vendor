import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Small helper text rendered below the field when there is no error. */
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = !error && hint ? `${inputId}-hint` : undefined;
    const describedBy = errorId ?? hintId;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-pearl block text-xs font-semibold tracking-[0.12em] uppercase"
          >
            {label}
            {props.required && (
              <span className="text-gold ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Surface — graphite with subtle inset highlight so the field
            // reads as "pressed in" against the page
            'bg-graphite/70 text-pearl placeholder:text-muted h-12 w-full rounded-lg border px-4 text-sm',
            'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] backdrop-blur-sm',
            // Motion
            'transition-[border-color,box-shadow,background-color] duration-300 ease-out',
            // Focus — gold ring with offset, matching Button focus-visible
            'focus:border-gold focus:bg-graphite focus:ring-gold/30 focus:ring-[3px] focus:outline-none',
            error
              ? 'border-error/70 focus:border-error focus:ring-error/30'
              : 'border-slate/60 hover:border-slate',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={props.required}
          {...props}
        />
        {error ? (
          <p
            id={errorId}
            className="text-error flex items-center gap-1.5 text-xs"
            role="alert"
          >
            <span
              className="bg-error inline-block h-1 w-1 rounded-full"
              aria-hidden="true"
            />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-muted text-xs leading-relaxed">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

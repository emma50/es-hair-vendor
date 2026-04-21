import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || props.name;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
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
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'bg-graphite/70 text-pearl placeholder:text-muted min-h-[120px] w-full rounded-lg border px-4 py-3 text-sm leading-relaxed',
            'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] backdrop-blur-sm',
            'transition-[border-color,box-shadow,background-color] duration-300 ease-out',
            'focus:border-gold focus:bg-graphite focus:ring-gold/30 focus:ring-[3px] focus:outline-none',
            'resize-y',
            error
              ? 'border-error/70 focus:border-error focus:ring-error/30'
              : 'border-slate/60 hover:border-slate',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={errorId}
          aria-required={props.required}
          {...props}
        />
        {error && (
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
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

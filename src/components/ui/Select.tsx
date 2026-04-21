import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={selectId}
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
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'bg-graphite/70 text-pearl h-12 w-full appearance-none rounded-lg border pr-10 pl-4 text-sm',
              'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] backdrop-blur-sm',
              'transition-[border-color,box-shadow,background-color] duration-300 ease-out',
              'focus:border-gold focus:bg-graphite focus:ring-gold/30 focus:ring-[3px] focus:outline-none',
              error
                ? 'border-error/70 focus:border-error focus:ring-error/30'
                : 'border-slate/60 hover:border-slate',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={errorId}
            aria-required={props.required}
            {...props}
          >
            {placeholder && (
              <option value="" className="text-muted">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom chevron — the native one is ugly on dark themes */}
          <svg
            aria-hidden="true"
            className="text-silver pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </div>
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

Select.displayName = 'Select';

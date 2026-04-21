'use client';

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface ErrorStateProps {
  /** Icon to display — defaults to AlertTriangle */
  icon?: LucideIcon;
  /** Human-readable headline */
  title?: string;
  /** Explanation of what happened + what the user can do */
  message?: string;
  /** Primary action: retry the failed operation */
  onRetry?: () => void;
  retryLabel?: string;
  /** Secondary escape route: navigate somewhere safe */
  backHref?: string;
  backLabel?: string;
  /** Compact mode for inline/section errors (no full-page padding) */
  compact?: boolean;
}

/**
 * Consistent error display for every failure in the app.
 *
 * Rules:
 * 1. Always human-readable — never show status codes or stack traces
 * 2. Always provide a next step — retry, go back, or contact support
 * 3. Same visual treatment everywhere — users recognize the pattern
 */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = 'Something went wrong',
  message = "We couldn't load this content. Please try again, or go back and start over.",
  onRetry,
  retryLabel = 'Try Again',
  backHref,
  backLabel = 'Go Back',
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? 'py-10' : 'justify-center py-16'}`}
      role="alert"
    >
      <div className="bg-error/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="text-error h-8 w-8" />
      </div>
      <h2 className="font-display text-ivory mb-2 text-xl font-semibold">
        {title}
      </h2>
      <p className="text-silver mb-6 max-w-md text-sm leading-relaxed">
        {message}
      </p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} size="sm">
            {retryLabel}
          </Button>
        )}
        {backHref && (
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              {backLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

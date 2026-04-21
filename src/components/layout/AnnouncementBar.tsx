'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface AnnouncementBarProps {
  message: string;
}

export function AnnouncementBar({ message }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('announcement-dismissed') !== 'true') {
      setVisible(true);
    }
  }, []);

  if (!visible || !message) return null;

  return (
    <div
      className="border-gold/15 from-gold-dark via-gold to-gold-dark text-midnight relative overflow-hidden border-b bg-gradient-to-r"
      role="status"
      aria-live="polite"
    >
      {/* Subtle inner shine */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.25)_50%,transparent_65%)] bg-[length:200%_100%] opacity-70"
        style={{ animation: 'shimmer 6s linear infinite' }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[40px] max-w-7xl items-center justify-center gap-2 px-10 py-2.5 text-center">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p className="text-[0.78rem] font-semibold tracking-[0.08em]">
          {message}
        </p>
        <button
          onClick={() => {
            setVisible(false);
            sessionStorage.setItem('announcement-dismissed', 'true');
          }}
          className="text-midnight/60 hover:text-midnight hover:bg-midnight/10 absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

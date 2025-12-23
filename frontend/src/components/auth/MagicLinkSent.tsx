import React from 'react';
import { Button } from '@/components/ui/button';

interface MagicLinkSentProps {
  onReset: () => void;
  email: string;
}

export const MagicLinkSent: React.FC<MagicLinkSentProps> = ({ onReset, email }) => {
  return (
    <div
      className="flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in duration-300"
      data-testid="magic-link-sent-container"
    >
      <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Sprawdź swoją pocztę</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Wysłaliśmy link logowania na <span className="font-medium text-foreground" data-testid="magic-link-sent-email">{email}</span>.
        <br />
        Kliknij link, aby się zalogować.
      </p>

      <Button variant="ghost" onClick={onReset} className="mt-4">
        Powrót do logowania
      </Button>
    </div>
  );
};

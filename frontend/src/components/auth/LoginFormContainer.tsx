import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { MagicLinkSent } from './MagicLinkSent';

type LoginViewState = 'idle' | 'success';

export const LoginFormContainer: React.FC = () => {
  const [viewState, setViewState] = useState<LoginViewState>('idle');
  const [email, setEmail] = useState('');

  const handleLoginSuccess = (userEmail: string) => {
    setEmail(userEmail);
    setViewState('success');
  };

  const handleReset = () => {
    setViewState('idle');
    setEmail('');
  };

  return (
    <div className="w-full">
      {viewState === 'idle' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <MagicLinkSent email={email} onReset={handleReset} />
      )}
    </div>
  );
};

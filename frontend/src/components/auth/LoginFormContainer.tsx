import React, { useState } from "react";
import { LoginForm } from "./LoginForm";
import { MagicLinkSent } from "./MagicLinkSent";
import { Loader2 } from "lucide-react";

type LoginViewState = "idle" | "success" | "authenticating";

export const LoginFormContainer: React.FC = () => {
  const [viewState, setViewState] = useState<LoginViewState>(() => {
    if (typeof window !== "undefined") {
      const loc = window.location;
      if (
        (loc.hash && /(access_token|error)/.test(loc.hash)) ||
        (loc.search && loc.search.includes("code="))
      ) {
        return "authenticating";
      }
    }
    return "idle";
  });
  const [email, setEmail] = useState("");

  const handleLoginSuccess = (userEmail: string) => {
    setEmail(userEmail);
    setViewState("success");
  };

  const handleReset = () => {
    setViewState("idle");
    setEmail("");
  };

  if (viewState === "authenticating") {
    return (
      <div
        className="flex flex-col items-center justify-center space-y-4 py-8"
        data-testid="auth-redirecting-state"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Trwa logowanie, proszę czekać...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {viewState === "idle" ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Witaj</h1>
            <p className="text-sm text-muted-foreground">
              Wpisz swój e‑mail, aby zalogować się do swojego konta
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

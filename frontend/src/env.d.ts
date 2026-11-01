/// <reference types="node" />
import type { SessionInfo } from "./types";

declare global {
  namespace App {
    interface Locals {
      trace_id: string;
      logger: import("./lib/utils/logger").StructuredLogger;
      user: { id: string; email: string } | null;
      accessToken: string | null;
      sessionInfo: SessionInfo | null;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SESSION_ENCRYPTION_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Prefer env vars; fall back to the existing hard-coded project if envs are missing.
// This lets you run locally without editing this file again.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Existing hard-coded PROD project (fallback only) */
const HARDCODED_URL = "https://xfdqnmtzuuphxivsgmua.supabase.co";
const HARDCODED_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0";

/** Environment (local/dev/prod) */
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const ENV_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/** Final values actually used by the browser client */
export const SUPABASE_URL = ENV_URL || HARDCODED_URL;
export const SUPABASE_ANON_KEY = ENV_ANON || HARDCODED_ANON;

if (!ENV_URL || !ENV_ANON) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Falling back to hard-coded project credentials. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to point at your local project during dev.",
  );
}

/** Optional: dev-time guard to warn when token issuer != configured URL */
function decodeJwtPayload<T = any>(jwt: string): T | null {
  try {
    const [, payload] = jwt.split(".");
    const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
    return JSON.parse(
      atob(pad(payload).replace(/-/g, "+").replace(/_/g, "/")),
    );
  } catch {
    return null;
  }
}
function warnIfIssuerMismatch(token?: string | null) {
  if (!import.meta.env.DEV || !token) return;
  const payload = decodeJwtPayload<{ iss?: string }>(token);
  if (!payload?.iss) return;
  try {
    const urlHost = new URL(SUPABASE_URL).host;
    const issHost = new URL(payload.iss).host;
    if (urlHost && issHost && urlHost !== issHost) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AuthEnvMismatch] Token issuer (${issHost}) != SUPABASE_URL (${urlHost}). ` +
          `Sign out and sign in to the project at ${urlHost}, or point VITE_SUPABASE_URL to ${issHost}.`,
      );
    }
  } catch {
    /* ignore */
  }
}

/** Export a single browser client everywhere */
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// Run the issuer guard once in dev
if (import.meta.env.DEV) {
  supabase.auth.getSession().then(({ data }) => {
    warnIfIssuerMismatch(data.session?.access_token ?? null);
  });
}

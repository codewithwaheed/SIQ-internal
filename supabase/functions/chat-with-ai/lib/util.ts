import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
}

export enum ERROR_CODES {
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export function createErrorResponse(message: string, status: number, code: ERROR_CODES): Response {
  return new Response(JSON.stringify({ error: message, status, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Create both clients and resolve user + role/org from incoming Authorization header. */
export async function getClientsAndUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let user: any = null;
  let userRole = "business_owner";
  let orgId: string | null = null;
  let isAuthenticated = false;

  try {
    const { data, error } = await supabaseAuth.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
      isAuthenticated = true;

      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (roleRow?.role) userRole = roleRow.role;

      const { data: orgRow } = await supabaseAdmin
        .from("organization_memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      orgId = orgRow?.org_id ?? null;
    }
  } catch (err) {
    console.warn("Auth lookup failed:", (err as Error).message);
  }

  return { supabaseAuth, supabaseAdmin, user, userRole, orgId, isAuthenticated };
}

export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

/** naive in-memory limiter (per instance). returns true if allowed */
const rlBuckets = new Map<string, { count: number; reset: number }>();
export function inMemoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = rlBuckets.get(key);
  if (!b || now > b.reset) {
    rlBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
    }
  if (b.count < max) {
    b.count += 1;
    return true;
  }
  return false;
}

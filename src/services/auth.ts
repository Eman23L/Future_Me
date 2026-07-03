import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

export type AccountIdentity = {
  userId: string;
  email: string | null;
};

let browserClient: SupabaseClient | null | undefined;

export function getBrowserSupabase() {
  if (browserClient !== undefined) return browserClient;

  const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  const url = viteEnv?.VITE_SUPABASE_URL;
  const anonKey = viteEnv?.VITE_SUPABASE_ANON_KEY;

  browserClient = url && anonKey
    ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
    : null;

  return browserClient;
}

export async function resolveInitialAccount(): Promise<AccountIdentity | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;

  const hasCallback = hasAuthCallbackParams();
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authCode = search.get("code");

  if (search.has("error") || search.has("error_code") || hash.has("error")) {
    await supabase.auth.signOut();
    throw new Error("This sign-in link was rejected. Please request a new magic link.");
  }

  if (hasCallback && authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      await supabase.auth.signOut();
      throw new Error("This sign-in link could not be verified. Please request a new magic link.");
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (hasCallback) await supabase.auth.signOut();
    throw error;
  }

  if (hasCallback && !data.session) {
    await supabase.auth.signOut();
    throw new Error("This sign-in link did not create a session. Please request a new magic link.");
  }

  return identityFromSession(data.session);
}

export function identityFromSession(session: Session | null): AccountIdentity | null {
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? null
  };
}

function hasAuthCallbackParams() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    search.has("code") ||
    search.has("error") ||
    search.has("error_code") ||
    hash.has("access_token") ||
    hash.has("refresh_token") ||
    hash.has("error")
  );
}

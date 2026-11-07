"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "./supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [configured]);

  return { session, ready, configured };
}

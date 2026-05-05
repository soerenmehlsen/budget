"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";

export function useSession() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!data.session) {
        if (isDemoMode()) {
          setIsCheckingSession(false);
          return;
        }
        router.replace("/");
        return;
      }

      setUserId(data.session.user.id);
      setIsCheckingSession(false);
    };

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isDemoMode()) {
          setIsCheckingSession(false);
          return;
        }
        router.replace("/");
        return;
      }

      setUserId(session.user.id);
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  return { userId, isCheckingSession };
}

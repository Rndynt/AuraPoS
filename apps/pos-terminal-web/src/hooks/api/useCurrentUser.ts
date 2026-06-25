/**
 * useCurrentUser — current authenticated user profile from /api/auth/me.
 *
 * Returns id, name, email, username, tenantId, and role.
 * Falls back to localStorage cache (aurapos_session_cached) for offline mode.
 */

import { useQuery } from "@tanstack/react-query";

const OFFLINE_SESSION_KEY = "aurapos_session_cached";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  tenantId: string | null;
  role: string | null;
};

async function fetchCurrentUser(): Promise<CurrentUser> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    // Offline fallback: read from localStorage cache
    const cached = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data) return parsed.data;
    }
    throw new Error("Not authenticated");
  }
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
}

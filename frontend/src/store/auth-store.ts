import { create } from "zustand";
import type { UserProfile } from "@devtoolbox/shared";

interface AuthState {
  user: UserProfile | null;
  // Held in memory only — never localStorage/sessionStorage. The refresh
  // token (the thing that actually needs long-term persistence) lives in
  // the httpOnly cookie the browser manages; this access token is
  // deliberately lost on a hard refresh and silently re-obtained via
  // POST /auth/refresh on next load (see AuthHydrator).
  accessToken: string | null;
  status: "loading" | "authenticated" | "anonymous";
  setSession: (accessToken: string, user: UserProfile) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: "loading",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  clearSession: () => set({ accessToken: null, user: null, status: "anonymous" }),
}));

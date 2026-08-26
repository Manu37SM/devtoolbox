import { create } from "zustand";
import type { UserProfile } from "@devtoolbox/shared";

interface AuthState {
  user: UserProfile | null;

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

"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (s: { token: string; user: AuthUser }) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: "trafficjam-auth" }
  )
);

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AppState {
  session: Session | null;
  user: User | null;
  settings: any | null;
  setSession: (session: Session | null) => void;
  setSettings: (settings: any | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  user: null,
  settings: null,
  setSession: (session) => set({ session, user: session?.user || null }),
  setSettings: (settings) => set({ settings }),
}));
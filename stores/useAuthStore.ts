import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Rôles simplifiés de l'application
 * - admin: Accès total (gestion utilisateurs, autorisations, etc.)
 * - entraineur: Accès à tout sauf gestion des autorisations
 * - user: Accès lecture seule (Entraînements, Matchs, Équipes)
 */
export type UserRole = 'admin' | 'entraineur' | 'user';

/**
 * Profil utilisateur VEEC stocké dans Supabase
 */
export interface VEECProfile {
  id: string;
  user_id: string;
  email: string;
  role: UserRole;
  nom?: string;
  prenom?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  // État de l'authentification
  user: User | null;
  profile: VEECProfile | null;
  session: Session | null;
  loading: boolean;

  // Actions
  setAuth: (user: User | null, profile: VEECProfile | null, session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;

  // Helpers
  isAuthenticated: () => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: () => boolean;
  isEntraineur: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      profile: null,
      session: null,
      loading: true,

      // Définir l'authentification
      setAuth: (user, profile, session) => {
        set({ user, profile, session, loading: false });
      },

      // Définir le loading
      setLoading: (loading) => {
        set({ loading });
      },

      // Nettoyer l'authentification (logout)
      clearAuth: () => {
        set({ user: null, profile: null, session: null, loading: false });
      },

      // Vérifier si l'utilisateur est authentifié
      isAuthenticated: () => {
        const state = get();
        return !!state.user && !!state.profile;
      },

      // Vérifier si l'utilisateur a un rôle spécifique
      hasRole: (role) => {
        const state = get();
        if (!state.profile) return false;

        if (Array.isArray(role)) {
          return role.includes(state.profile.role);
        }
        return state.profile.role === role;
      },

      // Vérifier si admin
      isAdmin: () => {
        const state = get();
        return state.profile?.role === 'admin';
      },

      // Vérifier si entraineur
      isEntraineur: () => {
        const state = get();
        return state.profile?.role === 'entraineur';
      },
    }),
    {
      name: 'veec-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Ne persister que le profil et la session (pas le user Supabase complet)
      partialize: (state) => ({
        profile: state.profile,
        session: state.session,
      }),
    }
  )
);

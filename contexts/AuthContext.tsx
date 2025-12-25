import React, { createContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore, type UserRole, type VEECProfile } from '../stores/useAuthStore';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: VEECProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nom: string, prenom: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile, session, loading, setAuth, setLoading, clearAuth } = useAuthStore();

  // Charger le profil utilisateur depuis veec_profiles
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('veec_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return null;
      }

      return data as VEECProfile;
    } catch (err) {
      console.error('Error loading profile:', err);
      return null;
    }
  };

  // Initialiser la session au chargement
  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profileData = await loadProfile(session.user.id);
        setAuth(session.user, profileData, session);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profileData = await loadProfile(session.user.id);
          setAuth(session.user, profileData, session);
        } else {
          clearAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connexion
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user && data.session) {
        const profileData = await loadProfile(data.user.id);
        setAuth(data.user, profileData, data.session);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Inscription
  const signUp = async (email: string, password: string, nom: string, prenom: string) => {
    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) return { error: authError };

      if (!authData.user) {
        return { error: new Error('Échec de la création du compte') };
      }

      // 2. Créer le profil dans veec_profiles
      // Note: Par défaut, les nouveaux utilisateurs ont le rôle 'user'
      const { error: profileError } = await supabase
        .from('veec_profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          role: 'user', // Rôle par défaut
          nom: nom,
          prenom: prenom,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: profileError };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Déconnexion
  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuth();
  };

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!profile) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

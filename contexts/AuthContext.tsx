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

  // Charger le profil utilisateur depuis veec_profiles avec timeout
  const loadProfile = async (userId: string): Promise<VEECProfile | null> => {
    try {
      console.log('🔵 [AuthContext] Chargement du profil pour userId:', userId);

      // Créer une promesse avec timeout de 3 secondes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout du chargement du profil')), 3000);
      });

      // Course entre la requête et le timeout
      const loadPromise = supabase
        .from('veec_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([loadPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ [AuthContext] Error loading profile:', error);
        return null;
      }

      console.log('✅ [AuthContext] Profil chargé:', data);
      return data as VEECProfile;
    } catch (err) {
      console.error('❌ [AuthContext] Error loading profile (catch):', err);
      return null;
    }
  };

  // Initialiser la session au chargement
  useEffect(() => {
    console.log('🔵 [AuthContext] Initialisation de la session...');

    let isInitialized = false;

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔵 [AuthContext] Auth state change:', event, session ? 'présente' : 'absente');

        // Gérer uniquement INITIAL_SESSION et SIGNED_OUT
        if (event === 'INITIAL_SESSION') {
          isInitialized = true;

          if (session?.user) {
            const profileData = await loadProfile(session.user.id);
            setAuth(session.user, profileData, session);
          } else {
            clearAuth();
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuth();
        } else {
          // Ignorer tous les autres événements (SIGNED_IN, TOKEN_REFRESHED, etc.)
          console.log('⚠️ [AuthContext] Événement ignoré:', event);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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

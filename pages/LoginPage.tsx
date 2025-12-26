import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabaseClient';
import type { VEECProfile } from '../stores/useAuthStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = async (userId: string): Promise<VEECProfile | null> => {
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Timeout de 10 secondes pour la connexion
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Timeout: La connexion prend trop de temps. Vérifiez votre connexion ou vos identifiants.');
    }, 10000);

    try {
      console.log('🔵 Étape 1: Connexion avec email/password...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Erreur connexion:', error);
        clearTimeout(timeoutId);
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('✅ Connexion réussie, user:', data.user?.id);
      console.log('Session:', data.session);

      if (data.user && data.session) {
        console.log('🔵 Étape 2: Chargement du profil...');
        const profileData = await loadProfile(data.user.id);
        console.log('✅ Profil chargé:', profileData);

        setAuth(data.user, profileData, data.session);
        console.log('✅ Auth mis à jour dans le store');

        clearTimeout(timeoutId);

        console.log('🔵 Étape 3: Redirection...');
        // Forcer un rechargement complet pour éviter les conflits de state
        window.location.href = '/team';
      } else {
        clearTimeout(timeoutId);
        setError('Connexion réussie mais aucune session créée');
        setLoading(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('❌ Erreur inattendue:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!nom || !prenom) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    // Timeout de 10 secondes
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Timeout: La création du profil prend trop de temps. Vérifiez vos politiques RLS dans Supabase.');
    }, 10000);

    try {
      console.log('🔵 Étape 1: Création du compte utilisateur...');

      // 1. Créer le compte utilisateur avec metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom: nom,
            prenom: prenom,
          }
        }
      });

      if (authError) {
        console.error('❌ Erreur signup:', authError);
        clearTimeout(timeoutId);
        setError(`Erreur signup: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('❌ Pas d\'utilisateur créé');
        clearTimeout(timeoutId);
        setError('Échec de la création du compte');
        setLoading(false);
        return;
      }

      console.log('✅ Utilisateur créé:', authData.user.id);
      console.log('Session:', authData.session);

      clearTimeout(timeoutId);

      // Le profil est créé automatiquement par le trigger PostgreSQL
      // Pas besoin de l'insérer manuellement

      if (!authData.session) {
        setSuccess('Compte créé ! Le profil a été créé automatiquement. Veuillez vérifier votre email pour confirmer votre inscription.');
      } else {
        setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      }
      setEmail('');
      setPassword('');
      setNom('');
      setPrenom('');
      setIsSignUp(false);
      setLoading(false);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('❌ Erreur inattendue:', err);
      setError(`Erreur: ${err.message || 'Une erreur est survenue'}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Veuillez entrer votre adresse email');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Erreur réinitialisation:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess('Un email de réinitialisation a été envoyé à votre adresse. Vérifiez votre boîte de réception.');
      setEmail('');
      setLoading(false);

      // Retour à la page de connexion après 3 secondes
      setTimeout(() => {
        setIsForgotPassword(false);
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('❌ Erreur inattendue:', err);
      setError(`Erreur: ${err.message || 'Une erreur est survenue'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black px-4">
      <div className="max-w-md w-full">
        <div className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
              VEEC Planning
            </h1>
            <p className="text-light-onSurface/70 dark:text-dark-onSurface/70">
              {isForgotPassword
                ? 'Réinitialiser votre mot de passe'
                : isSignUp
                ? 'Créer un compte'
                : 'Connectez-vous à votre compte'}
            </p>
          </div>

          {/* Messages d'erreur/succès */}
          {error && (
            <div className="mb-6 p-4 bg-veec-red/10 border border-veec-red/30 text-veec-red rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-veec-green/10 border border-veec-green/30 text-veec-green rounded-lg">
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={isForgotPassword ? handleForgotPassword : (isSignUp ? handleSignUp : handleSignIn)}>
            {!isForgotPassword && isSignUp && (
              <>
                <div className="mb-4">
                  <label htmlFor="nom" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                    required={isSignUp}
                    disabled={loading}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="prenom" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    id="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                    required={isSignUp}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                required
                disabled={loading}
              />
            </div>

            {!isForgotPassword && (
              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-light-primary dark:bg-dark-primary hover:opacity-90 text-light-onPrimary dark:text-dark-onPrimary font-semibold py-3 px-4 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </span>
              ) : isForgotPassword ? (
                'Envoyer le lien de réinitialisation'
              ) : isSignUp ? (
                'Créer un compte'
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Lien mot de passe oublié */}
          {!isSignUp && !isForgotPassword && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-light-primary dark:text-dark-primary hover:opacity-80 font-medium text-sm transition-opacity"
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Toggle Sign In / Sign Up / Forgot Password */}
          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-light-primary dark:text-dark-primary hover:opacity-80 font-medium text-sm transition-opacity"
                disabled={loading}
              >
                ← Retour à la connexion
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-light-primary dark:text-dark-primary hover:opacity-80 font-medium text-sm transition-opacity"
                disabled={loading}
              >
                {isSignUp
                  ? 'Vous avez déjà un compte ? Connectez-vous'
                  : "Pas encore de compte ? Inscrivez-vous"}
              </button>
            )}
          </div>
        </div>

        {/* Info rôles */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm border border-white/20">
          <p className="font-semibold mb-2">Rôles disponibles :</p>
          <ul className="space-y-1 text-xs">
            <li>• <strong>User</strong> : Accès lecture seule aux Entraînements, Matchs, Équipes</li>
            <li>• <strong>Entraîneur</strong> : Accès complet (Admin inclus) sauf gestion des autorisations</li>
            <li>• <strong>Admin</strong> : Accès complet à toutes les fonctionnalités incluant les autorisations</li>
          </ul>
          <p className="mt-2 text-xs opacity-75">Par défaut, les nouveaux comptes ont le rôle "user".</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

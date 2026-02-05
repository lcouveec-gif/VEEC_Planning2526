import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a un token de récupération valide
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Lien de réinitialisation invalide ou expiré');
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Erreur mise à jour mot de passe:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Rediriger vers la page de login après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
              Choisissez votre nouveau mot de passe
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
              <p className="text-sm">Mot de passe mis à jour avec succès ! Redirection...</p>
            </div>
          )}

          {/* Formulaire */}
          {!success && (
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                  required
                  disabled={loading}
                  minLength={6}
                  placeholder="Au moins 6 caractères"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-veec-green focus:border-transparent bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground"
                  required
                  disabled={loading}
                  minLength={6}
                  placeholder="Retapez votre mot de passe"
                />
              </div>

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
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </button>
            </form>
          )}

          {/* Retour à la connexion */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-light-primary dark:text-dark-primary hover:opacity-80 font-medium text-sm transition-opacity"
              disabled={loading}
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

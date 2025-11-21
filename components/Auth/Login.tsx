import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginProps {
  onSwitchToRegister: () => void;
  onClose: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onClose }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Erreur lors de la connexion');
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mb-6">
        Connexion
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pas encore de compte ?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-light-primary dark:text-dark-primary hover:underline font-medium"
          >
            S'inscrire
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;

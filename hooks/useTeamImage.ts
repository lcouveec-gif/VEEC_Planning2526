import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UseTeamImageResult {
  uploading: boolean;
  error: string | null;
  uploadTeamImage: (idequipe: string, file: File) => Promise<string | null>;
  deleteTeamImage: (imageUrl: string) => Promise<boolean>;
}

export function useTeamImage(): UseTeamImageResult {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadTeamImage = async (idequipe: string, file: File): Promise<string | null> => {
    try {
      setUploading(true);
      setError(null);

      // Valider le fichier
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('La taille du fichier ne doit pas dépasser 5MB');
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.');
      }

      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${idequipe}_${Date.now()}.${fileExt}`;
      const filePath = `team-images/${fileName}`;

      // Upload vers Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('VEEC_Media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('VEEC_Media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading team image:', err);
      setError(err.message || 'Erreur lors de l\'upload de l\'image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteTeamImage = async (imageUrl: string): Promise<boolean> => {
    try {
      setError(null);

      // Extraire le chemin du fichier depuis l'URL
      const urlParts = imageUrl.split('/team-images/');
      if (urlParts.length < 2) {
        throw new Error('URL d\'image invalide');
      }

      const filePath = `team-images/${urlParts[1]}`;

      // Supprimer de Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('VEEC_Media')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err: any) {
      console.error('Error deleting team image:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'image');
      return false;
    }
  };

  return {
    uploading,
    error,
    uploadTeamImage,
    deleteTeamImage,
  };
}

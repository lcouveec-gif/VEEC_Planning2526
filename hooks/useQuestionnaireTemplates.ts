import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  QuestionnaireTemplate,
  QuestionnaireTemplateWithQuestions,
  QuestionnaireQuestion,
  TypeQuestion,
} from '../types';

interface UseQuestionnaireTemplatesResult {
  templates: QuestionnaireTemplateWithQuestions[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTemplate: (nom: string, description?: string) => Promise<QuestionnaireTemplate | null>;
  updateTemplate: (id: string, updates: Partial<Pick<QuestionnaireTemplate, 'nom' | 'description'>>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  addQuestion: (
    templateId: string,
    libelle: string,
    type_question: TypeQuestion,
    obligatoire?: boolean,
  ) => Promise<QuestionnaireQuestion | null>;
  updateQuestion: (
    id: string,
    updates: Partial<Pick<QuestionnaireQuestion, 'libelle' | 'type_question' | 'obligatoire' | 'ordre'>>,
  ) => Promise<boolean>;
  deleteQuestion: (id: string) => Promise<boolean>;
  reorderQuestions: (templateId: string, orderedIds: string[]) => Promise<boolean>;
}

export function useQuestionnaireTemplates(): UseQuestionnaireTemplatesResult {
  const [templates, setTemplates] = useState<QuestionnaireTemplateWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [{ data: tplData, error: tplErr }, { data: qData, error: qErr }] = await Promise.all([
        supabase.from('questionnaire_templates').select('*').order('created_at', { ascending: true }),
        supabase.from('questionnaire_questions').select('*').order('ordre', { ascending: true }),
      ]);

      if (tplErr) throw tplErr;
      if (qErr) throw qErr;

      const merged: QuestionnaireTemplateWithQuestions[] = (tplData || []).map(t => ({
        ...t,
        questions: (qData || []).filter(q => q.template_id === t.id),
      }));

      setTemplates(merged);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des questionnaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = async (nom: string, description?: string): Promise<QuestionnaireTemplate | null> => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('questionnaire_templates')
        .insert([{ nom: nom.trim(), description: description?.trim() || null }])
        .select()
        .single();
      if (err) throw err;
      await fetchAll();
      return data;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du questionnaire.');
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<Pick<QuestionnaireTemplate, 'nom' | 'description'>>,
  ): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('questionnaire_templates')
        .update(updates)
        .eq('id', id);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du questionnaire.');
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('questionnaire_templates')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du questionnaire.');
      return false;
    }
  };

  const addQuestion = async (
    templateId: string,
    libelle: string,
    type_question: TypeQuestion,
    obligatoire = false,
  ): Promise<QuestionnaireQuestion | null> => {
    try {
      setError(null);
      // Calculer le prochain ordre
      const existing = templates.find(t => t.id === templateId);
      const nextOrdre = existing ? existing.questions.length : 0;

      const { data, error: err } = await supabase
        .from('questionnaire_questions')
        .insert([{ template_id: templateId, libelle: libelle.trim(), type_question, obligatoire, ordre: nextOrdre }])
        .select()
        .single();
      if (err) throw err;
      await fetchAll();
      return data;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout de la question.');
      return null;
    }
  };

  const updateQuestion = async (
    id: string,
    updates: Partial<Pick<QuestionnaireQuestion, 'libelle' | 'type_question' | 'obligatoire' | 'ordre'>>,
  ): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('questionnaire_questions')
        .update(updates)
        .eq('id', id);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de la question.');
      return false;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('questionnaire_questions')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la question.');
      return false;
    }
  };

  const reorderQuestions = async (templateId: string, orderedIds: string[]): Promise<boolean> => {
    try {
      setError(null);
      // Mise à jour optimiste
      setTemplates(prev => prev.map(t => {
        if (t.id !== templateId) return t;
        const reordered = orderedIds
          .map((qid, i) => {
            const q = t.questions.find(q => q.id === qid);
            return q ? { ...q, ordre: i } : null;
          })
          .filter(Boolean) as QuestionnaireQuestion[];
        return { ...t, questions: reordered };
      }));

      await Promise.all(
        orderedIds.map((qid, i) =>
          supabase.from('questionnaire_questions').update({ ordre: i }).eq('id', qid),
        ),
      );
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du réordonnancement.');
      await fetchAll();
      return false;
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    templates,
    loading,
    error,
    refetch: fetchAll,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}

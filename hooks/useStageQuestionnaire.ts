import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  StageQuestionnaire,
  QuestionnaireReponse,
  QuestionnaireReponseDetail,
  QuestionnaireTemplateWithQuestions,
  QuestionStats,
} from '../types';

interface SaveDetailInput {
  question_id: string;
  valeur_texte?: string | null;
  valeur_note?: number | null;
}

interface UseStageQuestionnaireResult {
  stageQuestionnaires: StageQuestionnaire[];
  reponses: QuestionnaireReponse[];
  reponseDetails: QuestionnaireReponseDetail[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  assignTemplate: (templateId: string) => Promise<boolean>;
  removeTemplate: (stageQuestionnaireId: string) => Promise<boolean>;
  saveReponse: (
    stageQuestionnaireId: string,
    inscriptionId: string,
    details: SaveDetailInput[],
  ) => Promise<boolean>;
  deleteReponse: (reponseId: string) => Promise<boolean>;
  getReponsePourInscription: (
    stageQuestionnaireId: string,
    inscriptionId: string,
  ) => QuestionnaireReponse | undefined;
  getDetailsForReponse: (reponseId: string) => QuestionnaireReponseDetail[];
  getStatsForQuestionnaire: (
    stageQuestionnaireId: string,
    template: QuestionnaireTemplateWithQuestions,
  ) => QuestionStats[];
}

export function useStageQuestionnaire(stageId: string): UseStageQuestionnaireResult {
  const [stageQuestionnaires, setStageQuestionnaires] = useState<StageQuestionnaire[]>([]);
  const [reponses, setReponses] = useState<QuestionnaireReponse[]>([]);
  const [reponseDetails, setReponseDetails] = useState<QuestionnaireReponseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!stageId) {
      setStageQuestionnaires([]);
      setReponses([]);
      setReponseDetails([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // 1. stage_questionnaires pour ce stage
      const { data: sqData, error: sqErr } = await supabase
        .from('stage_questionnaires')
        .select('*')
        .eq('stage_id', stageId)
        .order('created_at', { ascending: true });
      if (sqErr) throw sqErr;

      const sqList: StageQuestionnaire[] = sqData || [];

      if (sqList.length === 0) {
        setStageQuestionnaires([]);
        setReponses([]);
        setReponseDetails([]);
        return;
      }

      const sqIds = sqList.map(sq => sq.id);

      // 2. templates + questions + réponses + détails en parallèle
      const [
        { data: tplData, error: tplErr },
        { data: qData, error: qErr },
        { data: repData, error: repErr },
      ] = await Promise.all([
        supabase.from('questionnaire_templates').select('*').in('id', sqList.map(sq => sq.template_id)),
        supabase.from('questionnaire_questions').select('*').in('template_id', sqList.map(sq => sq.template_id)).order('ordre'),
        supabase.from('questionnaire_reponses').select('*').in('stage_questionnaire_id', sqIds),
      ]);

      if (tplErr) throw tplErr;
      if (qErr) throw qErr;
      if (repErr) throw repErr;

      // Enrichir stage_questionnaires avec leur template
      const enriched: StageQuestionnaire[] = sqList.map(sq => {
        const tpl = (tplData || []).find(t => t.id === sq.template_id);
        return {
          ...sq,
          template: tpl
            ? { ...tpl, questions: (qData || []).filter(q => q.template_id === tpl.id) }
            : undefined,
        };
      });

      setStageQuestionnaires(enriched);
      setReponses(repData || []);

      // 3. Détails des réponses
      const repIds = (repData || []).map(r => r.id);
      if (repIds.length > 0) {
        const { data: detData, error: detErr } = await supabase
          .from('questionnaire_reponses_details')
          .select('*')
          .in('reponse_id', repIds);
        if (detErr) throw detErr;
        setReponseDetails(detData || []);
      } else {
        setReponseDetails([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des questionnaires.');
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const assignTemplate = async (templateId: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('stage_questionnaires')
        .insert([{ stage_id: stageId, template_id: templateId }]);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'affectation du questionnaire.');
      return false;
    }
  };

  const removeTemplate = async (stageQuestionnaireId: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('stage_questionnaires')
        .delete()
        .eq('id', stageQuestionnaireId);
      if (err) throw err;
      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la désaffectation du questionnaire.');
      return false;
    }
  };

  const saveReponse = async (
    stageQuestionnaireId: string,
    inscriptionId: string,
    details: SaveDetailInput[],
  ): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      // Upsert la réponse principale
      const { data: repData, error: repErr } = await supabase
        .from('questionnaire_reponses')
        .upsert(
          {
            stage_questionnaire_id: stageQuestionnaireId,
            inscription_id: inscriptionId,
            soumis_le: new Date().toISOString(),
          },
          { onConflict: 'stage_questionnaire_id,inscription_id' },
        )
        .select()
        .single();
      if (repErr) throw repErr;

      // Upsert chaque détail
      if (details.length > 0) {
        const detailsPayload = details.map(d => ({
          reponse_id: repData.id,
          question_id: d.question_id,
          valeur_texte: d.valeur_texte ?? null,
          valeur_note: d.valeur_note ?? null,
        }));
        const { error: detErr } = await supabase
          .from('questionnaire_reponses_details')
          .upsert(detailsPayload, { onConflict: 'reponse_id,question_id' });
        if (detErr) throw detErr;
      }

      await fetchAll();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement des réponses.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteReponse = async (reponseId: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('questionnaire_reponses')
        .delete()
        .eq('id', reponseId);
      if (err) throw err;
      setReponses(prev => prev.filter(r => r.id !== reponseId));
      setReponseDetails(prev => prev.filter(d => d.reponse_id !== reponseId));
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la réponse.');
      return false;
    }
  };

  const getReponsePourInscription = (
    stageQuestionnaireId: string,
    inscriptionId: string,
  ): QuestionnaireReponse | undefined =>
    reponses.find(
      r => r.stage_questionnaire_id === stageQuestionnaireId && r.inscription_id === inscriptionId,
    );

  const getDetailsForReponse = (reponseId: string): QuestionnaireReponseDetail[] =>
    reponseDetails.filter(d => d.reponse_id === reponseId);

  const getStatsForQuestionnaire = (
    stageQuestionnaireId: string,
    template: QuestionnaireTemplateWithQuestions,
  ): QuestionStats[] => {
    const sqReponses = reponses.filter(r => r.stage_questionnaire_id === stageQuestionnaireId);

    return template.questions.map(q => {
      const answers = sqReponses
        .map(r => reponseDetails.find(d => d.reponse_id === r.id && d.question_id === q.id))
        .filter(Boolean) as QuestionnaireReponseDetail[];

      const nb_reponses = answers.length;

      if (q.type_question === 'texte_libre' || q.type_question === 'oui_non' || q.type_question === 'date') {
        return {
          question_id: q.id,
          libelle: q.libelle,
          type_question: q.type_question,
          nb_reponses,
          textes: answers.map(a => a.valeur_texte || '').filter(t => t.trim()),
        };
      }

      const notes = answers.map(a => a.valeur_note).filter((n): n is number => n !== null && n !== undefined);
      const distribution: Record<number, number> = {};
      notes.forEach(n => { distribution[n] = (distribution[n] || 0) + 1; });

      return {
        question_id: q.id,
        libelle: q.libelle,
        type_question: q.type_question,
        nb_reponses,
        moyenne: notes.length > 0 ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : undefined,
        min: notes.length > 0 ? Math.min(...notes) : undefined,
        max: notes.length > 0 ? Math.max(...notes) : undefined,
        distribution,
      };
    });
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stageQuestionnaires,
    reponses,
    reponseDetails,
    loading,
    saving,
    error,
    refetch: fetchAll,
    assignTemplate,
    removeTemplate,
    saveReponse,
    deleteReponse,
    getReponsePourInscription,
    getDetailsForReponse,
    getStatsForQuestionnaire,
  };
}

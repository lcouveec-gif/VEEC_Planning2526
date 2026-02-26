import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { QuestionnaireStats, QuestionStats, QuestionnaireReponseDetail } from '../types';

interface UseQuestionnaireStatsResult {
  stats: QuestionnaireStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQuestionnaireStats(templateId: string): UseQuestionnaireStatsResult {
  const [stats, setStats] = useState<QuestionnaireStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!templateId) {
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // 1. Récupérer le template et ses questions
      const [{ data: tplData, error: tplErr }, { data: qData, error: qErr }] = await Promise.all([
        supabase.from('questionnaire_templates').select('*').eq('id', templateId).single(),
        supabase.from('questionnaire_questions').select('*').eq('template_id', templateId).order('ordre'),
      ]);
      if (tplErr) throw tplErr;
      if (qErr) throw qErr;

      // 2. Toutes les affectations de ce template à des stages
      const { data: sqData, error: sqErr } = await supabase
        .from('stage_questionnaires')
        .select('*')
        .eq('template_id', templateId);
      if (sqErr) throw sqErr;

      if (!sqData || sqData.length === 0) {
        setStats({
          template_id: templateId,
          nom_template: tplData?.nom || '',
          stages: [],
          total_reponses: 0,
          questions: (qData || []).map(q => ({
            question_id: q.id,
            libelle: q.libelle,
            type_question: q.type_question,
            nb_reponses: 0,
            textes: [],
          })),
        });
        return;
      }

      const sqIds = sqData.map(sq => sq.id);
      const stageIds = [...new Set(sqData.map(sq => sq.stage_id))];

      // 3. Stages concernés + réponses + détails en parallèle
      const [
        { data: stagesData, error: stagesErr },
        { data: repData, error: repErr },
      ] = await Promise.all([
        supabase.from('stages').select('id, nom').in('id', stageIds),
        supabase.from('questionnaire_reponses').select('*').in('stage_questionnaire_id', sqIds),
      ]);
      if (stagesErr) throw stagesErr;
      if (repErr) throw repErr;

      const repIds = (repData || []).map(r => r.id);
      let detData: QuestionnaireReponseDetail[] = [];
      if (repIds.length > 0) {
        const { data: det, error: detErr } = await supabase
          .from('questionnaire_reponses_details')
          .select('*')
          .in('reponse_id', repIds);
        if (detErr) throw detErr;
        detData = det || [];
      }

      // 4. Agréger les stats par question
      const questions: QuestionStats[] = (qData || []).map(q => {
        const answers = (repData || [])
          .map(r => detData.find(d => d.reponse_id === r.id && d.question_id === q.id))
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

        const notes = answers
          .map(a => a.valeur_note)
          .filter((n): n is number => n !== null && n !== undefined);
        const distribution: Record<number, number> = {};
        notes.forEach(n => { distribution[n] = (distribution[n] || 0) + 1; });

        return {
          question_id: q.id,
          libelle: q.libelle,
          type_question: q.type_question,
          nb_reponses,
          moyenne: notes.length > 0
            ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10
            : undefined,
          min: notes.length > 0 ? Math.min(...notes) : undefined,
          max: notes.length > 0 ? Math.max(...notes) : undefined,
          distribution,
        };
      });

      // 5. Nb réponses par stage
      const stagesStats = (stagesData || []).map(s => {
        const sqForStage = sqData.filter(sq => sq.stage_id === s.id).map(sq => sq.id);
        const nbRep = (repData || []).filter(r => sqForStage.includes(r.stage_questionnaire_id)).length;
        return { stage_id: s.id, nom_stage: s.nom, nb_reponses: nbRep };
      });

      setStats({
        template_id: templateId,
        nom_template: tplData?.nom || '',
        stages: stagesStats,
        total_reponses: (repData || []).length,
        questions,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul des statistiques.');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

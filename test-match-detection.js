#!/usr/bin/env node

/**
 * Script de test pour diagnostiquer la détection domicile/extérieur
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testMatchDetection() {
  console.log('🔍 Test de détection domicile/extérieur pour SM4\n');

  // Récupérer l'équipe SM4
  const { data: teams } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('IDEQUIPE, NOM_FFVB')
    .eq('IDEQUIPE', 'SM4');

  if (!teams || teams.length === 0) {
    console.error('❌ Équipe SM4 non trouvée');
    return;
  }

  const team = teams[0];
  console.log('✅ Équipe trouvée:');
  console.log(`   ID: ${team.IDEQUIPE}`);
  console.log(`   Nom: "${team.NOM_FFVB}"`);
  console.log('');

  // Récupérer les prochains matchs
  const today = new Date().toISOString().split('T')[0];
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .gte('Date', today)
    .order('Date', { ascending: true })
    .order('Heure', { ascending: true })
    .limit(5);

  if (!matches || matches.length === 0) {
    console.log('❌ Aucun match futur trouvé pour SM4');
    return;
  }

  console.log(`📅 ${matches.length} prochains matchs trouvés:\n`);

  const normalizeTeamName = (name) => name?.trim().toLowerCase() || '';

  matches.forEach((match, index) => {
    console.log(`--- Match ${index + 1} ---`);
    console.log(`Date: ${match.Date} ${match.Heure}`);
    console.log(`Competition: ${match.Competition}`);
    console.log(`Salle: ${match.Salle}`);
    console.log('');

    console.log('📋 Données brutes:');
    console.log(`   EQA_nom: "${match.EQA_nom}"`);
    console.log(`   EQB_nom: "${match.EQB_nom}"`);
    console.log(`   Équipe VEEC: "${match.equipe?.NOM_FFVB}"`);
    console.log('');

    // Test de la logique
    const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';
    const nomVEECNormalized = normalizeTeamName(nomEquipeVEEC);
    const eqaNormalized = normalizeTeamName(match.EQA_nom);
    const eqbNormalized = normalizeTeamName(match.EQB_nom);

    console.log('🔄 Après normalisation:');
    console.log(`   EQA normalisé: "${eqaNormalized}"`);
    console.log(`   EQB normalisé: "${eqbNormalized}"`);
    console.log(`   VEEC normalisé: "${nomVEECNormalized}"`);
    console.log('');

    console.log('🎯 Comparaisons:');
    console.log(`   EQA === VEEC ? ${eqaNormalized === nomVEECNormalized}`);
    console.log(`   EQB === VEEC ? ${eqbNormalized === nomVEECNormalized}`);
    console.log('');

    const isHome = eqaNormalized === nomVEECNormalized;
    const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

    console.log('✨ Résultat:');
    console.log(`   Domicile/Extérieur: ${isHome ? 'DOMICILE' : 'EXTÉRIEUR'}`);
    console.log(`   Adversaire: "${adversaire}"`);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
  });
}

testMatchDetection()
  .then(() => {
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });

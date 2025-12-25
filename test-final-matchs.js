import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testMatches() {
  console.log('🧪 Test final - Requêtes matchs SM4\n');

  // Test 1: Match à venir
  console.log('📅 Test 1: Prochain match SM4');
  console.log('============================================================\n');

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select(`
      *,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .gte('Date', '2025-12-25')
    .order('Date', { ascending: true })
    .limit(1);

  if (upcomingMatches && upcomingMatches.length > 0) {
    const match = upcomingMatches[0];
    const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';
    const isHome = match.EQA_nom?.includes(nomEquipeVEEC) || match.EQA_nom === nomEquipeVEEC;
    const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

    console.log(`✅ Date: ${match.Date} à ${match.Heure}`);
    console.log(`✅ Notre équipe: ${nomEquipeVEEC}`);
    console.log(`✅ Adversaire: ${adversaire}`);
    console.log(`✅ Lieu: ${isHome ? 'Domicile' : 'Extérieur'}`);
    console.log(`✅ Salle: ${match.Salle}`);
    console.log(`✅ Score: ${match.Score || 'Non joué'}\n`);

    // Vérifications
    const checks = [
      { test: 'Adversaire correct', pass: adversaire === 'MELUN VAL DE SEINE VOLLEY-BALL' },
      { test: 'Lieu correct (Domicile)', pass: isHome === true },
      { test: 'Date correcte', pass: match.Date === '2026-01-10' },
    ];

    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.test}`);
    });
  } else {
    console.log('❌ Aucun match à venir trouvé');
  }

  // Test 2: Dernier match avec score
  console.log('\n\n📊 Test 2: Dernier match joué (avec score)');
  console.log('============================================================\n');

  const { data: pastMatches } = await supabase
    .from('matches')
    .select(`
      *,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .lt('Date', '2025-12-25')
    .order('Date', { ascending: false })
    .limit(1);

  if (pastMatches && pastMatches.length > 0) {
    const match = pastMatches[0];
    const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';
    const isHome = match.EQA_nom?.includes(nomEquipeVEEC) || match.EQA_nom === nomEquipeVEEC;
    const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

    console.log(`✅ Date: ${match.Date} à ${match.Heure}`);
    console.log(`✅ Notre équipe: ${nomEquipeVEEC}`);
    console.log(`✅ Adversaire: ${adversaire}`);
    console.log(`✅ Lieu: ${isHome ? 'Domicile' : 'Extérieur'}`);
    console.log(`✅ Salle: ${match.Salle}`);
    console.log(`✅ Score: ${match.Score || 'Non disponible'}`);
    console.log(`✅ Sets: ${match.Set || 'Non disponible'}`);
    console.log(`✅ Total: ${match.Total || 'Non disponible'}\n`);

    // Vérifications
    const checks = [
      { test: 'Adversaire identifié', pass: adversaire && adversaire !== 'Adversaire inconnu' },
      { test: 'Score présent', pass: match.Score && match.Score.trim().length > 0 },
      { test: 'Lieu déterminé', pass: isHome === true || isHome === false },
    ];

    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.test}`);
    });
  } else {
    console.log('❌ Aucun match passé trouvé');
  }

  console.log('\n\n🎉 Test terminé!\n');
}

testMatches();

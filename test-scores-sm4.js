import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testScores() {
  console.log('🔍 Recherche matchs SM4 avec scores\n');

  // Récupérer TOUS les matchs de SM4, passés
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .lt('Date', '2025-12-25')
    .order('Date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ ${matches.length} matchs passés trouvés\n`);

  matches.forEach((match, index) => {
    const hasScore = match.Score && match.Score.trim().length > 0;
    console.log(`${index + 1}. ${match.Date} - ${match.EQA_nom} vs ${match.EQB_nom}`);
    console.log(`   Score: "${match.Score}" (has score: ${hasScore})`);
    console.log(`   Set: "${match.Set}"`);
    console.log(`   Total: "${match.Total}"`);

    // Test de la logique actuelle
    const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';
    const isHome = match.EQA_nom?.includes(nomEquipeVEEC) ||
                   match.EQA_nom === nomEquipeVEEC;
    const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

    console.log(`   Notre équipe dans le match: ${nomEquipeVEEC}`);
    console.log(`   Adversaire détecté: ${adversaire}`);
    console.log(`   Lieu: ${isHome ? 'Domicile' : 'Extérieur'}`);
    console.log('');
  });
}

testScores();

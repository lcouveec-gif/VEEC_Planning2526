import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testPastMatches() {
  console.log('🔍 Test des matchs passés SM4\n');

  // Récupérer les matchs passés de SM4 avec score
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .not('Score', 'is', null)
    .order('Date', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ ${matches.length} matchs passés trouvés avec score\n`);

  // Afficher le dernier match en détail
  if (matches.length > 0) {
    const lastMatch = matches[0];
    console.log('📋 Dernier match avec score:');
    console.log('============================================================');
    console.log(JSON.stringify(lastMatch, null, 2));
    console.log('\n📊 Analyse du match:');
    console.log('============================================================');
    console.log('Date:', lastMatch.Date);
    console.log('Heure:', lastMatch.Heure);
    console.log('Score:', lastMatch.Score);
    console.log('Set:', lastMatch.Set);
    console.log('Total:', lastMatch.Total);
    console.log('EQA_nom:', lastMatch.EQA_nom);
    console.log('EQB_nom:', lastMatch.EQB_nom);
    console.log('NOM_FFVB (notre équipe):', lastMatch.equipe?.NOM_FFVB);
    console.log('Salle:', lastMatch.Salle);

    console.log('\n🧐 Logique appliquée:');
    console.log('============================================================');
    const nomEquipeVEEC = lastMatch.equipe?.NOM_FFVB || '';
    const isHome = lastMatch.EQA_nom?.includes(nomEquipeVEEC) ||
                   lastMatch.EQA_nom === nomEquipeVEEC;
    const adversaire = isHome ? lastMatch.EQB_nom : lastMatch.EQA_nom;

    console.log(`Notre équipe: ${nomEquipeVEEC}`);
    console.log(`EQA_nom contient notre équipe? ${isHome ? 'OUI' : 'NON'}`);
    console.log(`Lieu: ${isHome ? 'Domicile' : 'Extérieur'}`);
    console.log(`Adversaire: ${adversaire}`);
    console.log(`Score: ${lastMatch.Score || 'Non disponible'}`);
  }

  console.log('\n📋 Tous les matchs passés avec score:');
  console.log('============================================================\n');

  matches.forEach((match, index) => {
    const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';
    const isHome = match.EQA_nom?.includes(nomEquipeVEEC) ||
                   match.EQA_nom === nomEquipeVEEC;
    const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

    console.log(`${index + 1}. Date: ${match.Date} ${match.Heure}`);
    console.log(`   Lieu: ${isHome ? 'Domicile' : 'Extérieur'}`);
    console.log(`   EQA: ${match.EQA_nom}`);
    console.log(`   EQB: ${match.EQB_nom}`);
    console.log(`   Adversaire détecté: ${adversaire}`);
    console.log(`   Score: ${match.Score || 'N/A'}`);
    console.log(`   Sets: ${match.Set || 'N/A'}`);
    console.log(`   Total: ${match.Total || 'N/A'}`);
    console.log('');
  });
}

testPastMatches();

// Test pour diagnostiquer le problème des matchs SM4
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testMatchesSM4() {
  console.log('🔍 Test des matchs SM4\n');

  // Récupérer un match spécifique (10 janvier 2026)
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('idequipe', 'SM4')
    .eq('Date', '2026-01-10')
    .single();

  console.log('Match du 10 janvier 2026:');
  console.log('='.repeat(60));

  if (error) {
    console.log('Erreur:', error);
    return;
  }

  console.log(JSON.stringify(match, null, 2));

  console.log('\n📊 Analyse des données:');
  console.log('='.repeat(60));
  console.log('idequipe:', match.idequipe);
  console.log('Date:', match.Date);
  console.log('Heure:', match.Heure);
  console.log('Domicile_Exterieur:', match.Domicile_Exterieur);
  console.log('Equipe_1:', match.Equipe_1 || match.EQA_nom);
  console.log('Equipe_2:', match.Equipe_2 || match.EQB_nom);
  console.log('EQA_nom:', match.EQA_nom);
  console.log('EQB_nom:', match.EQB_nom);
  console.log('Salle:', match.Salle);
  console.log('NOM_FFVB:', match.NOM_FFVB);

  console.log('\n🧐 Analyse logique:');
  console.log('='.repeat(60));

  if (match.Domicile_Exterieur) {
    console.log(`Domicile_Exterieur = "${match.Domicile_Exterieur}"`);
    const isHome = match.Domicile_Exterieur.toLowerCase() === 'domicile';
    console.log(`Est à domicile (isHome) = ${isHome}`);

    console.log('\nLogique actuelle du code:');
    console.log(`  Si Domicile: adversaire = Equipe_2 (${match.Equipe_2 || 'vide'})`);
    console.log(`  Si Exterieur: adversaire = Equipe_1 (${match.Equipe_1 || 'vide'})`);

    const adversaireActuel = isHome ? match.Equipe_2 : match.Equipe_1;
    console.log(`\n❌ Adversaire retourné actuellement: ${adversaireActuel || 'inconnu'}`);
  }

  console.log('\n💡 Solution:');
  console.log('='.repeat(60));
  console.log('Il faut probablement utiliser EQA_nom et EQB_nom');
  console.log(`EQA_nom (Équipe A): ${match.EQA_nom}`);
  console.log(`EQB_nom (Équipe B): ${match.EQB_nom}`);
  console.log(`NOM_FFVB (notre équipe): ${match.NOM_FFVB}`);

  // Déterminer l'adversaire en comparant avec notre équipe
  let adversaireCorrect = null;
  if (match.EQA_nom && match.EQB_nom && match.NOM_FFVB) {
    if (match.EQA_nom.includes('VAL D\'EUROPE') || match.EQA_nom.includes(match.NOM_FFVB)) {
      adversaireCorrect = match.EQB_nom;
      console.log(`✅ Logique correcte: Notre équipe = EQA, Adversaire = EQB = ${adversaireCorrect}`);
    } else {
      adversaireCorrect = match.EQA_nom;
      console.log(`✅ Logique correcte: Notre équipe = EQB, Adversaire = EQA = ${adversaireCorrect}`);
    }
  }

  console.log('\n📋 Tous les matchs SM4 à venir:');
  console.log('='.repeat(60));

  const today = new Date().toISOString().split('T')[0];
  const { data: futureMatches } = await supabase
    .from('matches')
    .select('Date, Heure, Domicile_Exterieur, EQA_nom, EQB_nom, NOM_FFVB, Salle')
    .eq('idequipe', 'SM4')
    .gte('Date', today)
    .order('Date', { ascending: true })
    .order('Heure', { ascending: true })
    .limit(5);

  futureMatches?.forEach(m => {
    console.log(`\nDate: ${m.Date} ${m.Heure}`);
    console.log(`  Domicile/Ext: ${m.Domicile_Exterieur}`);
    console.log(`  EQA: ${m.EQA_nom}`);
    console.log(`  EQB: ${m.EQB_nom}`);
    console.log(`  Notre équipe: ${m.NOM_FFVB}`);
    console.log(`  Salle: ${m.Salle}`);
  });
}

testMatchesSM4().catch(console.error);

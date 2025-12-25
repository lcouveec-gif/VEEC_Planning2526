// Script de test pour diagnostiquer le problème SM4
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testSM4() {
  console.log('🔍 Test 0: Découverte de la structure de la table...\n');

  // D'abord, récupérons une ligne pour voir les colonnes disponibles
  const { data: sample } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('*')
    .limit(1);

  console.log('Exemple de données (première ligne):');
  console.log(JSON.stringify(sample, null, 2));
  console.log('\nColonnes disponibles:', sample && sample[0] ? Object.keys(sample[0]) : 'Aucune donnée');

  console.log('\n🔍 Test 1: Recherche de l\'équipe SM4...\n');

  // Test 1: Recherche par IDEQUIPE
  const { data: teams1, error: error1 } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('*')
    .ilike('IDEQUIPE', '%SM4%');

  console.log('Résultat recherche par IDEQUIPE:');
  console.log('Teams:', teams1);
  console.log('Error:', error1);

  if (!teams1 || teams1.length === 0) {
    console.log('\n❌ Aucune équipe trouvée avec IDEQUIPE like %SM4%');
    console.log('Test 2: Recherche par NOM_FFVB...\n');

    const { data: teams2, error: error2 } = await supabase
      .from('VEEC_Equipes_FFVB')
      .select('IDEQUIPE, NOM_FFVB')
      .ilike('NOM_FFVB', '%SM4%');

    console.log('Résultat recherche par NOM_FFVB:');
    console.log('Teams:', teams2);
    console.log('Error:', error2);
  }

  // Test 3: Lister toutes les équipes pour voir les valeurs réelles
  console.log('\n📋 Test 3: Liste de toutes les équipes...\n');
  const { data: allTeams } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('*')
    .order('NOM_FFVB');

  console.log('Toutes les équipes:');
  allTeams?.forEach(team => {
    console.log(JSON.stringify(team, null, 2));
  });

  // Test 4: Si on trouve l'équipe, tester la requête collectifs
  if (teams1 && teams1.length > 0) {
    const teamId = teams1[0].IDEQUIPE;
    console.log(`\n👥 Test 4: Recherche des joueurs pour l'équipe ${teamId}...\n`);

    const { data: collectifs, error: collectifsError } = await supabase
      .from('VEEC_Collectifs')
      .select(`
        IDLicencie,
        VEEC_Licencie (
          IDLicencie,
          Nom_Licencie,
          Prenom_Licencie,
          Numero_Maillot,
          Poste_Habituel
        )
      `)
      .eq('IDEQUIPE', teamId);

    console.log('Résultat collectifs:');
    console.log('Data:', collectifs);
    console.log('Error:', collectifsError);
    console.log('Nombre de joueurs:', collectifs?.length || 0);
  }
}

testSM4().catch(console.error);

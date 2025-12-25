// Test final pour valider la logique du serveur MCP
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testGetPlayersSM4() {
  console.log('🔍 Test complet: Récupération des joueurs SM4...\n');

  // Étape 1: Trouver l'équipe
  console.log('Étape 1: Recherche de l\'équipe SM4');
  let { data: teams } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('IDEQUIPE, NOM_FFVB')
    .ilike('IDEQUIPE', '%SM4%');

  if (!teams || teams.length === 0) {
    const result = await supabase
      .from('VEEC_Equipes_FFVB')
      .select('IDEQUIPE, NOM_FFVB')
      .ilike('NOM_FFVB', '%SM4%');
    teams = result.data;
  }

  console.log('Équipes trouvées:', teams);

  if (!teams || teams.length === 0) {
    console.log('❌ Aucune équipe trouvée');
    return;
  }

  const teamIds = teams.map(t => t.IDEQUIPE);
  console.log('Team IDs:', teamIds);

  // Étape 2: Récupérer les collectifs
  console.log('\nÉtape 2: Récupération des collectifs');
  const { data: collectifs, error: collectifsError } = await supabase
    .from('VEEC_Collectifs')
    .select('licencie_id, numero_maillot, poste')
    .in('equipe_id', teamIds);

  console.log('Collectifs trouvés:', collectifs?.length || 0);
  console.log('Erreur:', collectifsError);

  if (!collectifs || collectifs.length === 0) {
    console.log('❌ Aucun collectif trouvé');
    return;
  }

  // Étape 3: Récupérer les licenciés
  console.log('\nÉtape 3: Récupération des licenciés');
  const licencieIds = collectifs.map(c => c.licencie_id);
  const { data: licencies, error: licenciesError } = await supabase
    .from('VEEC_Licencie')
    .select('id, Nom_Licencie, Prenom_Licencie, Date_Naissance_licencie')
    .in('id', licencieIds);

  console.log('Licenciés trouvés:', licencies?.length || 0);
  console.log('Erreur:', licenciesError);

  // Étape 4: Fusion des données
  console.log('\nÉtape 4: Fusion des données');
  const licencieMap = new Map(licencies?.map(l => [l.id, l]) || []);
  const results = collectifs.map(c => {
    const licencie = licencieMap.get(c.licencie_id);
    return {
      id: licencie?.id,
      nom: licencie?.Nom_Licencie,
      prenom: licencie?.Prenom_Licencie,
      numero: c.numero_maillot,
      poste: c.poste,
      dateNaissance: licencie?.Date_Naissance_licencie,
    };
  });

  console.log('\n✅ Résultat final:');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nNombre de joueurs: ${results.length}`);
}

testGetPlayersSM4().catch(console.error);

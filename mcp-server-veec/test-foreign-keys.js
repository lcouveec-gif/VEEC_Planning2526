// Test pour vérifier que les Foreign Keys fonctionnent correctement
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testForeignKeys() {
  console.log('🔍 Test des Foreign Keys après installation\n');

  // ============================================================
  // Test 1: JOIN automatique Collectifs → Equipe
  // ============================================================
  console.log('Test 1: JOIN automatique Collectifs → Equipe');
  console.log('='.repeat(60));

  const { data: test1, error: error1 } = await supabase
    .from('VEEC_Collectifs')
    .select(`
      id,
      numero_maillot,
      poste,
      equipe:VEEC_Equipes_FFVB!fk_collectifs_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('equipe_id', 'SM4')
    .limit(3);

  if (error1) {
    console.log('❌ Erreur:', error1.message);
    console.log('⚠️  La foreign key fk_collectifs_equipe n\'est probablement pas encore créée');
  } else {
    console.log('✅ JOIN automatique fonctionne!');
    console.log('Résultat:');
    console.log(JSON.stringify(test1, null, 2));
  }

  // ============================================================
  // Test 2: JOIN automatique Collectifs → Licencié
  // ============================================================
  console.log('\n\nTest 2: JOIN automatique Collectifs → Licencié');
  console.log('='.repeat(60));

  const { data: test2, error: error2 } = await supabase
    .from('VEEC_Collectifs')
    .select(`
      id,
      numero_maillot,
      poste,
      licencie:VEEC_Licencie!fk_collectifs_licencie(id, Nom_Licencie, Prenom_Licencie)
    `)
    .eq('equipe_id', 'SM4')
    .limit(3);

  if (error2) {
    console.log('❌ Erreur:', error2.message);
    console.log('⚠️  La foreign key fk_collectifs_licencie n\'est probablement pas encore créée');
  } else {
    console.log('✅ JOIN automatique fonctionne!');
    console.log('Résultat:');
    console.log(JSON.stringify(test2, null, 2));
  }

  // ============================================================
  // Test 3: Double JOIN (Équipe + Licencié en même temps)
  // ============================================================
  console.log('\n\nTest 3: Double JOIN (Équipe + Licencié)');
  console.log('='.repeat(60));

  const { data: test3, error: error3 } = await supabase
    .from('VEEC_Collectifs')
    .select(`
      id,
      numero_maillot,
      poste,
      equipe:VEEC_Equipes_FFVB!fk_collectifs_equipe(IDEQUIPE, NOM_FFVB),
      licencie:VEEC_Licencie!fk_collectifs_licencie(id, Nom_Licencie, Prenom_Licencie)
    `)
    .eq('equipe_id', 'SM4')
    .limit(3);

  if (error3) {
    console.log('❌ Erreur:', error3.message);
    console.log('⚠️  Une ou plusieurs foreign keys ne sont pas encore créées');
  } else {
    console.log('✅ Double JOIN fonctionne!');
    console.log('Résultat:');
    console.log(JSON.stringify(test3, null, 2));
  }

  // ============================================================
  // Test 4: JOIN automatique Matchs → Equipe
  // ============================================================
  console.log('\n\nTest 4: JOIN automatique Matchs → Equipe');
  console.log('='.repeat(60));

  const { data: test4, error: error4 } = await supabase
    .from('matches')
    .select(`
      id,
      Date,
      Heure,
      equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
    `)
    .eq('idequipe', 'SM4')
    .limit(3);

  if (error4) {
    console.log('❌ Erreur:', error4.message);
    console.log('⚠️  La foreign key fk_matches_equipe n\'est probablement pas encore créée');
  } else {
    console.log('✅ JOIN automatique fonctionne!');
    console.log('Résultat:');
    console.log(JSON.stringify(test4, null, 2));
  }

  // ============================================================
  // Test 5: Comparaison de performance
  // ============================================================
  console.log('\n\nTest 5: Comparaison de performance');
  console.log('='.repeat(60));

  // Méthode 1: Sans JOIN (2 requêtes)
  const start1 = Date.now();
  const { data: collectifs1 } = await supabase
    .from('VEEC_Collectifs')
    .select('licencie_id, numero_maillot, poste')
    .eq('equipe_id', 'SM4');

  const licencieIds = collectifs1?.map(c => c.licencie_id) || [];
  const { data: licencies1 } = await supabase
    .from('VEEC_Licencie')
    .select('id, Nom_Licencie, Prenom_Licencie')
    .in('id', licencieIds);
  const time1 = Date.now() - start1;

  console.log(`Sans JOIN (2 requêtes séparées): ${time1}ms`);

  // Méthode 2: Avec JOIN (1 requête)
  const start2 = Date.now();
  const { data: collectifs2, error: error5 } = await supabase
    .from('VEEC_Collectifs')
    .select(`
      numero_maillot,
      poste,
      licencie:VEEC_Licencie!fk_collectifs_licencie(id, Nom_Licencie, Prenom_Licencie)
    `)
    .eq('equipe_id', 'SM4');
  const time2 = Date.now() - start2;

  if (error5) {
    console.log(`Avec JOIN (1 requête): ❌ Erreur - ${error5.message}`);
  } else {
    console.log(`Avec JOIN (1 requête): ${time2}ms`);
    console.log(`\n🚀 Gain de performance: ${Math.round((1 - time2/time1) * 100)}%`);
  }

  // ============================================================
  // Résumé
  // ============================================================
  console.log('\n\n📊 Résumé des tests');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Collectifs → Equipe', error: error1 },
    { name: 'Collectifs → Licencié', error: error2 },
    { name: 'Double JOIN', error: error3 },
    { name: 'Matchs → Equipe', error: error4 },
  ];

  const success = tests.filter(t => !t.error).length;
  const total = tests.length;

  console.log(`Tests réussis: ${success}/${total}`);

  if (success === total) {
    console.log('\n✅ Toutes les foreign keys sont correctement installées!');
    console.log('✅ Le serveur MCP peut maintenant utiliser les JOINs automatiques');
    console.log('\nProchaine étape: Mettre à jour src/index.ts avec la version optimisée');
  } else {
    console.log('\n⚠️  Certaines foreign keys ne sont pas encore installées');
    console.log('📖 Consultez FOREIGN_KEYS_GUIDE.md pour les instructions d\'installation');
    console.log('🔧 Exécutez le script foreign-keys.sql dans Supabase SQL Editor');
  }
}

testForeignKeys().catch(console.error);

// Script pour vérifier s'il y a des données orphelines AVANT d'installer les foreign keys
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkOrphanData() {
  console.log('🔍 Vérification des données orphelines\n');
  console.log('Ce script identifie les données qui empêcheraient l\'installation des foreign keys\n');

  let hasOrphans = false;

  // ============================================================
  // Check 1: Collectifs avec equipe_id invalide
  // ============================================================
  console.log('Check 1: Collectifs avec equipe_id invalide');
  console.log('='.repeat(60));

  const { data: allCollectifs } = await supabase
    .from('VEEC_Collectifs')
    .select('id, equipe_id, licencie_id');

  const { data: allEquipes } = await supabase
    .from('VEEC_Equipes_FFVB')
    .select('IDEQUIPE');

  const validEquipeIds = new Set(allEquipes?.map(e => e.IDEQUIPE) || []);
  const orphanCollectifsEquipe = allCollectifs?.filter(
    c => c.equipe_id && !validEquipeIds.has(c.equipe_id)
  ) || [];

  if (orphanCollectifsEquipe.length > 0) {
    console.log(`❌ ${orphanCollectifsEquipe.length} collectif(s) avec equipe_id invalide:`);
    orphanCollectifsEquipe.forEach(c => {
      console.log(`   - Collectif ${c.id}: equipe_id="${c.equipe_id}" (équipe inexistante)`);
    });
    hasOrphans = true;
  } else {
    console.log('✅ Aucun collectif orphelin (equipe_id)');
  }

  // ============================================================
  // Check 2: Collectifs avec licencie_id invalide
  // ============================================================
  console.log('\n\nCheck 2: Collectifs avec licencie_id invalide');
  console.log('='.repeat(60));

  const { data: allLicencies } = await supabase
    .from('VEEC_Licencie')
    .select('id');

  const validLicencieIds = new Set(allLicencies?.map(l => l.id) || []);
  const orphanCollectifsLicencie = allCollectifs?.filter(
    c => c.licencie_id && !validLicencieIds.has(c.licencie_id)
  ) || [];

  if (orphanCollectifsLicencie.length > 0) {
    console.log(`❌ ${orphanCollectifsLicencie.length} collectif(s) avec licencie_id invalide:`);
    orphanCollectifsLicencie.forEach(c => {
      console.log(`   - Collectif ${c.id}: licencie_id="${c.licencie_id}" (licencié inexistant)`);
    });
    hasOrphans = true;
  } else {
    console.log('✅ Aucun collectif orphelin (licencie_id)');
  }

  // ============================================================
  // Check 3: Matchs avec idequipe invalide
  // ============================================================
  console.log('\n\nCheck 3: Matchs avec idequipe invalide');
  console.log('='.repeat(60));

  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, idequipe')
    .not('idequipe', 'is', null);

  const orphanMatches = allMatches?.filter(
    m => m.idequipe && !validEquipeIds.has(m.idequipe)
  ) || [];

  if (orphanMatches.length > 0) {
    console.log(`❌ ${orphanMatches.length} match(s) avec idequipe invalide:`);
    orphanMatches.forEach(m => {
      console.log(`   - Match ${m.id}: idequipe="${m.idequipe}" (équipe inexistante)`);
    });
    hasOrphans = true;
  } else {
    console.log('✅ Aucun match orphelin (idequipe)');
  }

  // ============================================================
  // Résumé et recommandations
  // ============================================================
  console.log('\n\n📊 Résumé');
  console.log('='.repeat(60));

  if (hasOrphans) {
    console.log('❌ Des données orphelines ont été détectées\n');
    console.log('⚠️  Vous devez corriger ces données avant d\'installer les foreign keys\n');
    console.log('Options de correction:\n');

    if (orphanCollectifsEquipe.length > 0) {
      console.log(`1. Collectifs avec equipe_id invalide (${orphanCollectifsEquipe.length}):`);
      console.log('   Option A: Supprimer ces collectifs');
      console.log('   Option B: Corriger l\'equipe_id avec un code valide');
      console.log('   Option C: Créer les équipes manquantes\n');
    }

    if (orphanCollectifsLicencie.length > 0) {
      console.log(`2. Collectifs avec licencie_id invalide (${orphanCollectifsLicencie.length}):`);
      console.log('   Option A: Supprimer ces collectifs');
      console.log('   Option B: Corriger le licencie_id avec un ID valide');
      console.log('   Option C: Créer les licenciés manquants\n');
    }

    if (orphanMatches.length > 0) {
      console.log(`3. Matchs avec idequipe invalide (${orphanMatches.length}):`);
      console.log('   Option A: Mettre idequipe à NULL (recommandé pour l\'historique)');
      console.log('   Option B: Corriger l\'idequipe avec un code valide');
      console.log('   Option C: Créer les équipes manquantes\n');
    }

    console.log('Scripts SQL de correction:');
    console.log('-'.repeat(60));

    if (orphanCollectifsEquipe.length > 0) {
      console.log('\n-- Supprimer les collectifs avec equipe_id invalide:');
      orphanCollectifsEquipe.forEach(c => {
        console.log(`DELETE FROM "VEEC_Collectifs" WHERE id = '${c.id}';`);
      });
    }

    if (orphanCollectifsLicencie.length > 0) {
      console.log('\n-- Supprimer les collectifs avec licencie_id invalide:');
      orphanCollectifsLicencie.forEach(c => {
        console.log(`DELETE FROM "VEEC_Collectifs" WHERE id = '${c.id}';`);
      });
    }

    if (orphanMatches.length > 0) {
      console.log('\n-- Mettre idequipe à NULL pour les matchs orphelins:');
      orphanMatches.forEach(m => {
        console.log(`UPDATE matches SET idequipe = NULL WHERE id = '${m.id}';`);
      });
    }

    console.log('\n\n⏭️  Prochaines étapes:');
    console.log('1. Copiez les scripts SQL ci-dessus');
    console.log('2. Exécutez-les dans Supabase SQL Editor');
    console.log('3. Ré-exécutez ce script pour vérifier');
    console.log('4. Installez les foreign keys avec foreign-keys.sql\n');

  } else {
    console.log('✅ Aucune donnée orpheline détectée!\n');
    console.log('🎉 Vous pouvez installer les foreign keys en toute sécurité\n');
    console.log('Prochaines étapes:');
    console.log('1. Ouvrez Supabase Dashboard > SQL Editor');
    console.log('2. Copiez le contenu de foreign-keys.sql');
    console.log('3. Exécutez le script');
    console.log('4. Testez avec: node test-foreign-keys.js\n');
  }

  // ============================================================
  // Statistiques bonus
  // ============================================================
  console.log('\n📈 Statistiques de la base de données');
  console.log('='.repeat(60));
  console.log(`Équipes: ${allEquipes?.length || 0}`);
  console.log(`Licenciés: ${allLicencies?.length || 0}`);
  console.log(`Collectifs: ${allCollectifs?.length || 0}`);
  console.log(`Matchs: ${allMatches?.length || 0}`);
}

checkOrphanData().catch(console.error);

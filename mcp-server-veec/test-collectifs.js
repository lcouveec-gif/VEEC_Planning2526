// Test pour diagnostiquer la relation VEEC_Collectifs -> VEEC_Licencie
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testCollectifs() {
  console.log('🔍 Test 1: Structure de VEEC_Collectifs...\n');

  const { data: sample1, error: error1 } = await supabase
    .from('VEEC_Collectifs')
    .select('*')
    .limit(1);

  console.log('VEEC_Collectifs - Exemple:');
  console.log(JSON.stringify(sample1, null, 2));
  console.log('Error:', error1);
  console.log('Colonnes:', sample1 && sample1[0] ? Object.keys(sample1[0]) : 'Aucune');

  console.log('\n🔍 Test 2: Structure de VEEC_Licencie...\n');

  const { data: sample2, error: error2 } = await supabase
    .from('VEEC_Licencie')
    .select('*')
    .limit(1);

  console.log('VEEC_Licencie - Exemple:');
  console.log(JSON.stringify(sample2, null, 2));
  console.log('Error:', error2);
  console.log('Colonnes:', sample2 && sample2[0] ? Object.keys(sample2[0]) : 'Aucune');

  console.log('\n🔍 Test 3: Collectifs pour équipe SM4...\n');

  const { data: collectifs, error: error3 } = await supabase
    .from('VEEC_Collectifs')
    .select('*')
    .eq('equipe_id', 'SM4');

  console.log('Collectifs SM4:');
  console.log(JSON.stringify(collectifs, null, 2));
  console.log('Error:', error3);
  console.log('Nombre:', collectifs?.length || 0);

  if (collectifs && collectifs.length > 0) {
    console.log('\n🔍 Test 4: Tester différentes syntaxes de join...\n');

    // Trouver le nom de la colonne qui fait référence au licencié
    const firstCollectif = collectifs[0];
    console.log('Premier collectif:', firstCollectif);

    // Essai 1: avec la syntaxe Foreign Key standard
    console.log('\nEssai 1: Foreign Key syntax');
    const { data: test1, error: err1 } = await supabase
      .from('VEEC_Collectifs')
      .select('*, VEEC_Licencie!VEEC_Collectifs_licencie_id_fkey(*)')
      .eq('equipe_id', 'SM4')
      .limit(1);

    console.log('Result:', test1);
    console.log('Error:', err1);

    // Essai 2: sans foreign key, récupération manuelle
    if (firstCollectif.licencie_id) {
      console.log('\nEssai 2: Récupération manuelle avec licencie_id');
      const { data: licencie, error: err2 } = await supabase
        .from('VEEC_Licencie')
        .select('*')
        .eq('id', firstCollectif.licencie_id)
        .single();

      console.log('Licencié:', licencie);
      console.log('Error:', err2);
    }
  }
}

testCollectifs().catch(console.error);

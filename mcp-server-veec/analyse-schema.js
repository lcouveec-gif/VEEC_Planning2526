// Script pour analyser toutes les tables et leurs colonnes
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function analyzeSchema() {
  console.log('📊 Analyse du schéma de la base de données\n');

  const tables = [
    'VEEC_Equipes_FFVB',
    'VEEC_Collectifs',
    'VEEC_Licencie',
    'matches',
    'training_sessions'
  ];

  for (const table of tables) {
    console.log(`\n🔍 Table: ${table}`);
    console.log('='.repeat(60));

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Erreur: ${error.message}`);
      continue;
    }

    if (data && data[0]) {
      const columns = Object.keys(data[0]);
      console.log('Colonnes:');
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`  - ${col}: ${type} ${value !== null ? `(ex: ${JSON.stringify(value)})` : '(null)'}`);
      });
    } else {
      console.log('Aucune donnée disponible');
    }
  }

  console.log('\n\n📋 Relations suggérées:');
  console.log('='.repeat(60));
  console.log(`
1. VEEC_Collectifs.equipe_id → VEEC_Equipes_FFVB.IDEQUIPE
   - Type: Many-to-One (plusieurs joueurs par équipe)
   - Action ON DELETE: CASCADE (si équipe supprimée, supprimer le collectif)
   - Action ON UPDATE: CASCADE

2. VEEC_Collectifs.licencie_id → VEEC_Licencie.id
   - Type: Many-to-One (un joueur peut être dans plusieurs collectifs)
   - Action ON DELETE: CASCADE
   - Action ON UPDATE: CASCADE

3. matches.idequipe → VEEC_Equipes_FFVB.IDEQUIPE
   - Type: Many-to-One (plusieurs matchs par équipe)
   - Action ON DELETE: SET NULL (garder l'historique des matchs)
   - Action ON UPDATE: CASCADE
  `);
}

analyzeSchema().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('Date', '2025-12-06')
    .eq('idequipe', 'SM4');

  console.log('Matchs du 6 décembre SM4:\n');
  data.forEach(m => {
    console.log('Match:', m.match);
    console.log('EQA:', m.EQA_nom);
    console.log('EQB:', m.EQB_nom);
    console.log('Score:', m.Score);
    console.log('---');
  });
}

check();

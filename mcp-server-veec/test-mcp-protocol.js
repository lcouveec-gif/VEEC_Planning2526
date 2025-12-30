#!/usr/bin/env node

/**
 * Test script to simulate exact MCP protocol call/response for get_players
 * This simulates what the LLM client (Claude Desktop, ChatGPT) would see
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Fonction formatPlayerRich exactement comme dans index.ts
function formatPlayerRich(player) {
  const emoji = player.categorie === 'SEN' ? '👤' : '🧒';

  let info = `${emoji} **${player.prenom} ${player.nom}**\n`;

  if (player.numeroLicence) {
    info += `   🎫 Licence: ${player.numeroLicence}\n`;
  }

  if (player.categorie) {
    info += `   📊 Catégorie: ${player.categorie}\n`;
  }

  if (player.dateNaissance) {
    const dateNaissance = new Date(player.dateNaissance);
    const age = Math.floor((Date.now() - dateNaissance.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    info += `   🎂 Né(e) le: ${dateNaissance.toLocaleDateString('fr-FR')} (${age} ans)\n`;
  }

  // Afficher les équipes
  if (player.equipe) {
    // Format pour recherche par équipe (1 équipe)
    info += `   👕 Équipe: ${player.equipe}`;
    if (player.numeroMaillot) {
      info += ` - N°${player.numeroMaillot}`;
    }
    if (player.poste) {
      info += ` - ${player.poste}`;
    }
    info += '\n';
  } else if (player.equipes && player.equipes.length > 0) {
    // Format pour recherche globale (plusieurs équipes possibles)
    info += `   👕 Équipe(s):\n`;
    player.equipes.forEach(eq => {
      info += `      • ${eq.equipe}`;
      if (eq.numeroMaillot) {
        info += ` - N°${eq.numeroMaillot}`;
      }
      if (eq.poste) {
        info += ` - ${eq.poste}`;
      }
      info += '\n';
    });
  }

  return info.trim();
}

async function testGetPlayersTool(args) {
  console.log('📋 Simulating MCP Tool Call: get_players');
  console.log('📥 Input arguments:', JSON.stringify(args, null, 2));
  console.log('');

  try {
    // Simulate getPlayers function from index.ts
    let query = supabase
      .from("VEEC_Equipes_FFVB")
      .select("IDEQUIPE");

    if (args.team) {
      query = query.eq("IDEQUIPE", args.team);
    }

    const { data: teams, error: teamError } = await query;

    if (teamError) {
      throw teamError;
    }

    if (!teams || teams.length === 0) {
      return {
        success: false,
        error: `Aucune équipe trouvée${args.team ? ` pour "${args.team}"` : ''}`,
      };
    }

    const teamIds = teams.map((t) => t.IDEQUIPE);

    const { data: collectifs, error } = await supabase
      .from("VEEC_Collectifs")
      .select(`
        equipe_id,
        numero_maillot,
        poste,
        licencie:VEEC_Licencie!fk_collectifs_licencie(
          id,
          Num_Licencie,
          Nom_Licencie,
          Prenom_Licencie,
          Date_Naissance_licencie,
          Categorie_licencie
        )
      `)
      .in("equipe_id", teamIds);

    if (error) {
      throw error;
    }

    if (!collectifs || collectifs.length === 0) {
      return {
        success: false,
        error: `Aucun joueur trouvé pour l'équipe "${args.team}". Vérifiez que l'équipe a des joueurs enregistrés dans VEEC_Collectifs.`,
      };
    }

    // Transform results
    let results = collectifs.map((c) => ({
      id: c.licencie?.id,
      numeroLicence: c.licencie?.Num_Licencie,
      nom: c.licencie?.Nom_Licencie,
      prenom: c.licencie?.Prenom_Licencie,
      dateNaissance: c.licencie?.Date_Naissance_licencie,
      categorie: c.licencie?.Categorie_licencie,
      equipe: c.equipe_id,
      numeroMaillot: c.numero_maillot,
      poste: c.poste,
    }));

    // Filter by search if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.nom?.toLowerCase().includes(searchLower) ||
          p.prenom?.toLowerCase().includes(searchLower)
      );
    }

    const result = {
      success: true,
      data: results.sort((a, b) => {
        const nomA = a.nom || "";
        const nomB = b.nom || "";
        return nomA.localeCompare(nomB);
      }),
      count: results.length,
    };

    // Format output exactly as MCP Server would
    const formattedPlayers = result.data.map((player) => formatPlayerRich(player));
    const mcpResponse = {
      content: [
        {
          type: "text",
          text: `✅ ${result.count} joueur(s) trouvé(s)\n\n${formattedPlayers.join('\n\n')}`,
        },
      ],
    };

    console.log('✅ Raw data returned by getPlayers():');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    console.log('📤 MCP Protocol Response (what LLM client receives):');
    console.log(JSON.stringify(mcpResponse, null, 2));
    console.log('');
    console.log('👁️  Formatted text display (what user would see):');
    console.log('─'.repeat(60));
    console.log(mcpResponse.content[0].text);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Test with SM4 team
console.log('🧪 Testing get_players tool with team=SM4\n');
testGetPlayersTool({ team: 'SM4' })
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

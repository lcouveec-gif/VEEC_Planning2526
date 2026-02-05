#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Configuration Supabase depuis les variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis");
  process.exit(1);
}

// Initialisation du client Supabase
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapping des logos d'équipes (émojis pour une meilleure compatibilité)
const TEAM_LOGOS: Record<string, string> = {
  'veec': '🏐',
  'default': '⚪'
};

// Fonction pour générer l'URL Waze depuis une adresse
function generateWazeUrl(adresse: string, ville: string, codePostal: string): string {
  const fullAddress = `${adresse}, ${codePostal} ${ville}`;
  return `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`;
}

// Fonction pour générer l'URL Google Maps depuis une adresse
function generateGoogleMapsUrl(adresse: string, ville: string, codePostal: string): string {
  const fullAddress = `${adresse}, ${codePostal} ${ville}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

// Définition des outils disponibles
const TOOLS: Tool[] = [
  {
    name: "get_current_datetime",
    description: "Obtient la date et l'heure actuelles en français",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "calculate_date",
    description: "Calcule une date relative à aujourd'hui (demain, hier, semaine prochaine, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "number",
          description: "Décalage par rapport à aujourd'hui (positif = futur, négatif = passé)",
        },
        unit: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Unité de temps",
        },
      },
      required: ["offset", "unit"],
    },
  },
  {
    name: "get_matches",
    description: "Récupère les matchs des équipes VEEC avec filtres optionnels (équipe, dates, compétition)",
    inputSchema: {
      type: "object",
      properties: {
        team: {
          type: "string",
          description: "Code de l'équipe (SM1, SM4, U18M, etc.) ou nom complet",
        },
        startDate: {
          type: "string",
          description: "Date de début au format YYYY-MM-DD",
        },
        endDate: {
          type: "string",
          description: "Date de fin au format YYYY-MM-DD",
        },
        competition: {
          type: "string",
          description: "Nom de la compétition",
        },
      },
    },
  },
  {
    name: "get_players",
    description: "Récupère les informations complètes des joueurs licenciés FFVB: numéro de licence, nom, prénom, date de naissance, catégorie, équipe(s), numéro de maillot et poste. Filtres disponibles: recherche par nom/prénom ou par équipe.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Recherche par nom ou prénom",
        },
        team: {
          type: "string",
          description: "Filtrer par équipe (SM1, SM4, U18M, etc.)",
        },
      },
    },
  },
  {
    name: "get_teams",
    description: "Récupère la liste des équipes du club VEEC avec leurs informations",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Recherche par nom d'équipe ou division",
        },
      },
    },
  },
  {
    name: "get_training_sessions",
    description: "Récupère les créneaux d'entraînement avec filtres optionnels (équipe, jour, gymnase)",
    inputSchema: {
      type: "object",
      properties: {
        team: {
          type: "string",
          description: "Nom de l'équipe",
        },
        day: {
          type: "string",
          description: "Jour de la semaine (lundi, mardi, etc.)",
        },
        gym: {
          type: "string",
          description: "Nom du gymnase",
        },
      },
    },
  },
  {
    name: "get_statistics",
    description: "Récupère les statistiques générales du club (nombre d'entraînements, matchs, équipes, joueurs)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Implémentation des fonctions

function getCurrentDateTime() {
  const now = new Date();
  return {
    dateComplete: now.toISOString(),
    dateFr: now.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    jourSemaine: now.toLocaleDateString("fr-FR", { weekday: "long" }),
    iso: now.toISOString().split("T")[0],
    timestamp: now.getTime(),
  };
}

function calculateDate(offset: number, unit: "day" | "week" | "month") {
  const now = new Date();
  const targetDate = new Date(now);

  switch (unit) {
    case "day":
      targetDate.setDate(targetDate.getDate() + offset);
      break;
    case "week":
      targetDate.setDate(targetDate.getDate() + offset * 7);
      break;
    case "month":
      targetDate.setMonth(targetDate.getMonth() + offset);
      break;
  }

  return {
    dateComplete: targetDate.toISOString(),
    dateFr: targetDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    jourSemaine: targetDate.toLocaleDateString("fr-FR", { weekday: "long" }),
    iso: targetDate.toISOString().split("T")[0],
  };
}

// Fonction pour formater un joueur avec une présentation riche
function formatPlayerRich(player: any): string {
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
    // Format pour recherche générale (plusieurs équipes possibles)
    info += `   👕 Équipe(s):\n`;
    player.equipes.forEach((eq: any) => {
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

// Fonction pour formater un match avec une présentation riche
function formatMatchRich(match: any): string {
  const logoVEEC = TEAM_LOGOS['veec'];
  const logoAdversaire = TEAM_LOGOS['default'];

  // Formater la date en français
  const dateObj = new Date(match.date + 'T00:00:00');
  const dateFr = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Déterminer l'icône de lieu
  const lieuIcon = match.domicileExterieur === 'Domicile' ? '🏠' : '✈️';

  // Formater le score si disponible
  let scoreText = '';
  if (match.score) {
    scoreText = `\n📊 Score: ${match.score}`;
    if (match.sets) {
      scoreText += ` (${match.sets})`;
    }
  }

  // Afficher les infos du gymnase
  let gymInfo = '';
  if (match.gymnase) {
    const gym = match.gymnase;

    // Si le gymnase a une adresse complète, afficher les infos détaillées
    if (gym.adresse && gym.ville && gym.code_postal) {
      const fullAddress = `${gym.adresse}, ${gym.code_postal} ${gym.ville}`;
      const wazeUrl = generateWazeUrl(gym.adresse, gym.ville, gym.code_postal);
      const googleMapsUrl = generateGoogleMapsUrl(gym.adresse, gym.ville, gym.code_postal);

      gymInfo = `\n\n📍 **Lieu:** ${gym.nom}\n   ${fullAddress}`;

      // Ajouter les coordonnées GPS si disponibles
      if (gym.latitude && gym.longitude) {
        gymInfo += `\n   📌 GPS: ${gym.latitude}, ${gym.longitude}`;
      }

      gymInfo += `\n\n🗺️ **Navigation:**\n   • [Ouvrir dans Waze](${wazeUrl})\n   • [Ouvrir dans Google Maps](${googleMapsUrl})`;
    } else {
      // Juste le nom du gymnase sans adresse
      gymInfo = `\n\n📍 **Salle:** ${gym.nom}`;
    }
  } else if (match.salle) {
    // Pas d'info gymnase dans la base, afficher juste le nom
    gymInfo = `\n\n📍 **Salle:** ${match.salle}`;
  }

  // Construire le texte formaté
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏐 **MATCH ${match.competition}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 **Date:** ${dateFr}
⏰ **Heure:** ${match.heure}

${lieuIcon} **${match.domicileExterieur.toUpperCase()}**

${logoVEEC} **${match.equipeVEEC}**
    VS
${logoAdversaire} **${match.adversaire}**${scoreText}${gymInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

async function getMatches(args: {
  team?: string;
  startDate?: string;
  endDate?: string;
  competition?: string;
}) {
  try {
    let teamIds: string[] = [];

    // Recherche de l'équipe si spécifiée
    if (args.team) {
      let { data: teams } = await supabase
        .from("VEEC_Equipes_FFVB")
        .select("IDEQUIPE, NOM_FFVB")
        .ilike("IDEQUIPE", `%${args.team}%`);

      if (!teams || teams.length === 0) {
        const result = await supabase
          .from("VEEC_Equipes_FFVB")
          .select("IDEQUIPE, NOM_FFVB")
          .ilike("NOM_FFVB", `%${args.team}%`);
        teams = result.data;
      }

      if (teams && teams.length > 0) {
        teamIds = teams.map((t: any) => t.IDEQUIPE);
      }
    }

    // ✨ Utilisation du JOIN automatique avec la foreign key
    let query = supabase
      .from("matches")
      .select(`
        *,
        equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
      `)
      .order("Date", { ascending: true })
      .order("Heure", { ascending: true });

    if (args.startDate) {
      query = query.gte("Date", args.startDate);
    }
    if (args.endDate) {
      query = query.lte("Date", args.endDate);
    }
    if (args.competition) {
      query = query.ilike("Competition", `%${args.competition}%`);
    }
    if (teamIds.length > 0) {
      query = query.in("idequipe", teamIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Récupérer les noms de salles uniques pour faire la jointure avec gymnases
    const salleNames = [...new Set((data || []).map((m: any) => m.Salle).filter(Boolean))];

    // Récupérer les informations des gymnases
    let gymnasesMap: Record<string, any> = {};
    if (salleNames.length > 0) {
      const { data: gymnasesData } = await supabase
        .from("gymnases")
        .select("nom, adresse, ville, code_postal, latitude, longitude")
        .in("nom", salleNames);

      if (gymnasesData) {
        gymnasesData.forEach((gym: any) => {
          gymnasesMap[gym.nom] = gym;
        });
      }
    }

    // Transformer les données brutes en format structuré
    const matchesData = (data || []).map((match: any) => {
      // ✨ Utilisation de EQA_nom et EQB_nom pour déterminer domicile/extérieur
      // Si EQA_nom correspond à notre équipe → on joue à DOMICILE, adversaire = EQB_nom
      // Si EQB_nom correspond à notre équipe → on joue à EXTERIEUR, adversaire = EQA_nom
      const nomEquipeVEEC = match.equipe?.NOM_FFVB || "";
      const isHome = match.EQA_nom?.includes(nomEquipeVEEC) ||
                     match.EQA_nom === nomEquipeVEEC;
      const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

      // Récupérer les infos du gymnase s'il existe
      const gymnaseInfo = match.Salle ? gymnasesMap[match.Salle] : null;

      return {
        id: match.idmatch,
        date: match.Date,
        heure: match.Heure,
        competition: match.Competition,
        equipeVEEC: nomEquipeVEEC || "Équipe inconnue",
        numeroEquipe: match.equipe?.IDEQUIPE,
        adversaire: adversaire || "Adversaire inconnu",
        domicileExterieur: isHome ? "Domicile" : "Exterieur",
        lieu: isHome ? "à domicile" : "à l'extérieur",
        salle: match.Salle,
        gymnase: gymnaseInfo, // Ajout des infos du gymnase
        score: match.Score || null,
        sets: match.Set || null,
        total: match.Total || null,
      };
    });

    // Générer la présentation enrichie pour chaque match
    const formattedMatches = matchesData.map(match => formatMatchRich(match));

    return {
      success: true,
      data: matchesData,
      formatted: formattedMatches.join('\n\n'),
      count: matchesData.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erreur lors de la récupération des matchs",
    };
  }
}

async function getPlayers(args: { search?: string; team?: string }) {
  try {
    if (args.team) {
      // Recherche par équipe via VEEC_Collectifs
      let { data: teams } = await supabase
        .from("VEEC_Equipes_FFVB")
        .select("IDEQUIPE, NOM_FFVB")
        .ilike("IDEQUIPE", `%${args.team}%`);

      if (!teams || teams.length === 0) {
        const result = await supabase
          .from("VEEC_Equipes_FFVB")
          .select("IDEQUIPE, NOM_FFVB")
          .ilike("NOM_FFVB", `%${args.team}%`);
        teams = result.data;
      }

      if (!teams || teams.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          message: `Aucune équipe trouvée avec le nom ou code "${args.team}"`,
        };
      }

      const teamIds = teams.map((t: any) => t.IDEQUIPE);

      // ✨ Utilisation du JOIN automatique avec la foreign key
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

      if (error) throw error;

      if (!collectifs || collectifs.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          message: `Aucun joueur trouvé dans le collectif de l'équipe ${teamIds.join(', ')}. Vérifiez que l'équipe existe (ex: SM1, SM4, SF1, U18M, etc.)`,
        };
      }

      // Transformation des résultats (déjà jointés!)
      let results = collectifs.map((c: any) => ({
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

      // Filtrage par recherche si nécessaire
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        results = results.filter(
          (r: any) =>
            r.nom?.toLowerCase().includes(searchLower) ||
            r.prenom?.toLowerCase().includes(searchLower)
        );
      }

      return {
        success: true,
        data: results,
        count: results.length,
      };
    }

    // Recherche sans équipe
    if (args.search) {
      const { data: nomResults } = await supabase
        .from("VEEC_Licencie")
        .select("*")
        .ilike("Nom_Licencie", `%${args.search}%`)
        .order("Nom_Licencie", { ascending: true });

      const { data: prenomResults } = await supabase
        .from("VEEC_Licencie")
        .select("*")
        .ilike("Prenom_Licencie", `%${args.search}%`)
        .order("Nom_Licencie", { ascending: true });

      const allResults = [...(nomResults || []), ...(prenomResults || [])];
      const uniquePlayers = Array.from(
        new Map(allResults.map((p) => [p.id, p])).values()
      );

      // Pour chaque joueur, récupérer ses infos de collectif s'il en fait partie
      const playerIds = uniquePlayers.map((p: any) => p.id);
      const { data: collectifsData } = await supabase
        .from("VEEC_Collectifs")
        .select("licencie_id, equipe_id, numero_maillot, poste")
        .in("licencie_id", playerIds);

      // Créer un mapping licencie_id -> collectif
      const collectifsMap: Record<string, any[]> = {};
      (collectifsData || []).forEach((c: any) => {
        if (!collectifsMap[c.licencie_id]) {
          collectifsMap[c.licencie_id] = [];
        }
        collectifsMap[c.licencie_id].push({
          equipe: c.equipe_id,
          numeroMaillot: c.numero_maillot,
          poste: c.poste,
        });
      });

      return {
        success: true,
        data: uniquePlayers.map((player: any) => ({
          id: player.id,
          numeroLicence: player.Num_Licencie,
          nom: player.Nom_Licencie,
          prenom: player.Prenom_Licencie,
          dateNaissance: player.Date_Naissance_licencie,
          categorie: player.Categorie_licencie,
          equipes: collectifsMap[player.id] || [],
        })),
        count: uniquePlayers.length,
      };
    }

    // Tous les joueurs
    const { data, error } = await supabase
      .from("VEEC_Licencie")
      .select("*")
      .order("Nom_Licencie", { ascending: true });

    if (error) throw error;

    // Récupérer les infos de collectifs pour tous les joueurs
    const playerIds = (data || []).map((p: any) => p.id);
    const { data: collectifsData } = await supabase
      .from("VEEC_Collectifs")
      .select("licencie_id, equipe_id, numero_maillot, poste")
      .in("licencie_id", playerIds);

    // Créer un mapping licencie_id -> collectifs
    const collectifsMap: Record<string, any[]> = {};
    (collectifsData || []).forEach((c: any) => {
      if (!collectifsMap[c.licencie_id]) {
        collectifsMap[c.licencie_id] = [];
      }
      collectifsMap[c.licencie_id].push({
        equipe: c.equipe_id,
        numeroMaillot: c.numero_maillot,
        poste: c.poste,
      });
    });

    return {
      success: true,
      data: (data || []).map((player: any) => ({
        id: player.id,
        numeroLicence: player.Num_Licencie,
        nom: player.Nom_Licencie,
        prenom: player.Prenom_Licencie,
        dateNaissance: player.Date_Naissance_licencie,
        categorie: player.Categorie_licencie,
        equipes: collectifsMap[player.id] || [],
      })),
      count: data?.length || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erreur lors de la récupération des joueurs",
    };
  }
}

async function getTeams(args: { search?: string }) {
  try {
    if (args.search) {
      const { data: nameResults } = await supabase
        .from("VEEC_Equipes_FFVB")
        .select("*")
        .ilike("NOM_FFVB", `%${args.search}%`)
        .order("NOM_FFVB", { ascending: true });

      const { data: divisionResults } = await supabase
        .from("VEEC_Equipes_FFVB")
        .select("*")
        .ilike("DIVISION", `%${args.search}%`)
        .order("NOM_FFVB", { ascending: true });

      const allResults = [...(nameResults || []), ...(divisionResults || [])];
      const uniqueResults = Array.from(
        new Map(allResults.map((team) => [team.IDEQUIPE, team])).values()
      );

      return {
        success: true,
        data: uniqueResults.map((team: any) => ({
          id: team.IDEQUIPE,
          nom: team.NOM_FFVB,
          division: team.DIVISION,
          code: team.IDEQUIPE,
          couleurPrincipale: team.COULEUR_PRINCIPALE,
          couleurSecondaire: team.COULEUR_SECONDAIRE,
        })),
        count: uniqueResults.length,
      };
    }

    const { data, error } = await supabase
      .from("VEEC_Equipes_FFVB")
      .select("*")
      .order("NOM_FFVB", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((team: any) => ({
        id: team.IDEQUIPE,
        nom: team.NOM_FFVB,
        division: team.DIVISION,
        code: team.IDEQUIPE,
        couleurPrincipale: team.COULEUR_PRINCIPALE,
        couleurSecondaire: team.COULEUR_SECONDAIRE,
      })),
      count: data?.length || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erreur lors de la récupération des équipes",
    };
  }
}

async function getTrainingSessions(args: { team?: string; day?: string; gym?: string }) {
  try {
    let query = supabase
      .from("training_sessions")
      .select("*")
      .order("id", { ascending: true });

    if (args.team) {
      query = query.ilike("team", `%${args.team}%`);
    }
    if (args.day) {
      query = query.ilike("day", `%${args.day}%`);
    }
    if (args.gym) {
      query = query.ilike("gym", `%${args.gym}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((item: any) => ({
        id: item.id,
        equipe: item.team,
        entraineur: item.coach,
        jour: item.day,
        gymnase: item.gym,
        terrains: item.courts,
        heureDebut: item.start_time,
        heureFin: item.end_time,
      })),
      count: data?.length || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erreur lors de la récupération des entraînements",
    };
  }
}

async function getStatistics() {
  try {
    const [trainingSessions, matches, teams, players] = await Promise.all([
      supabase.from("training_sessions").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("idmatch", { count: "exact", head: true }),
      supabase.from("VEEC_Equipes_FFVB").select("IDEQUIPE", { count: "exact", head: true }),
      supabase.from("VEEC_Licencie").select("IDLicencie", { count: "exact", head: true }),
    ]);

    return {
      success: true,
      data: {
        nombreEntrainements: trainingSessions.count || 0,
        nombreMatchs: matches.count || 0,
        nombreEquipes: teams.count || 0,
        nombreJoueurs: players.count || 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erreur lors de la récupération des statistiques",
    };
  }
}

// Création du serveur MCP
const server = new Server(
  {
    name: "mcp-server-veec",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler pour lister les outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handler pour exécuter les outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result;

    switch (name) {
      case "get_current_datetime":
        result = getCurrentDateTime();
        break;

      case "calculate_date":
        result = calculateDate(
          (args as any).offset || 0,
          (args as any).unit || "day"
        );
        break;

      case "get_matches":
        result = await getMatches(args as any);
        break;

      case "get_players":
        result = await getPlayers(args as any);
        break;

      case "get_teams":
        result = await getTeams(args as any);
        break;

      case "get_training_sessions":
        result = await getTrainingSessions(args as any);
        break;

      case "get_statistics":
        result = await getStatistics();
        break;

      default:
        throw new Error(`Outil inconnu: ${name}`);
    }

    // Pour get_matches, utiliser le format enrichi si disponible
    if (name === "get_matches" &&
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        result.success &&
        'formatted' in result) {
      return {
        content: [
          {
            type: "text",
            text: `✅ ${result.count} match(es) trouvé(s)\n\n${result.formatted}`,
          },
        ],
      };
    }

    // Pour get_players, utiliser un formatage enrichi
    if (name === "get_players" &&
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        result.success &&
        'data' in result &&
        'count' in result &&
        Array.isArray(result.data)) {
      const formattedPlayers = result.data.map((player: any) => formatPlayerRich(player));
      return {
        content: [
          {
            type: "text",
            text: `✅ ${result.count} joueur(s) trouvé(s)\n\n${formattedPlayers.join('\n\n')}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Démarrage du serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 MCP Server VEEC démarré");
}

main().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});

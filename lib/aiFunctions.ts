import { supabase } from './supabaseClient';

/**
 * Définition des fonctions disponibles pour l'assistant IA
 * Ces fonctions permettent d'accéder aux données Supabase
 */

export interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

// Fonction utilitaire pour obtenir la date/heure actuelle
function getCurrentDateTime() {
  const now = new Date();
  return {
    success: true,
    data: {
      dateComplete: now.toISOString(),
      dateFr: now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      jourSemaine: now.toLocaleDateString('fr-FR', { weekday: 'long' }),
      timestamp: now.getTime(),
      iso: now.toISOString().split('T')[0], // Format YYYY-MM-DD
    },
  };
}

// Fonction utilitaire pour calculer des dates relatives
function calculateDate(args: { offset?: number; unit?: 'day' | 'week' | 'month' }) {
  const now = new Date();
  const offset = args.offset || 0;
  const unit = args.unit || 'day';

  const targetDate = new Date(now);

  switch (unit) {
    case 'day':
      targetDate.setDate(targetDate.getDate() + offset);
      break;
    case 'week':
      targetDate.setDate(targetDate.getDate() + (offset * 7));
      break;
    case 'month':
      targetDate.setMonth(targetDate.getMonth() + offset);
      break;
  }

  return {
    success: true,
    data: {
      dateComplete: targetDate.toISOString(),
      dateFr: targetDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      jourSemaine: targetDate.toLocaleDateString('fr-FR', { weekday: 'long' }),
      iso: targetDate.toISOString().split('T')[0], // Format YYYY-MM-DD
    },
  };
}

// Fonction pour récupérer les entraînements
async function getTrainingSessions(args: { team?: string; day?: string; gym?: string }) {
  try {
    let query = supabase
      .from('training_sessions')
      .select('*')
      .order('id', { ascending: true });

    if (args.team) {
      query = query.ilike('team', `%${args.team}%`);
    }
    if (args.day) {
      query = query.ilike('day', `%${args.day}%`);
    }
    if (args.gym) {
      query = query.ilike('gym', `%${args.gym}%`);
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
      error: error.message || 'Erreur lors de la récupération des entraînements',
    };
  }
}

// Fonction pour récupérer les matchs
async function getMatches(args: {
  team?: string;
  startDate?: string;
  endDate?: string;
  competition?: string;
  location?: 'domicile' | 'exterieur';
}) {
  try {
    // Si on cherche par équipe, d'abord trouver l'ID de l'équipe VEEC
    let teamIds: string[] = [];
    if (args.team) {
      // Essayer d'abord par IDEQUIPE
      let { data: teams, error: teamError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .select('IDEQUIPE, NOM_FFVB')
        .ilike('IDEQUIPE', `%${args.team}%`);

      // Si aucune équipe trouvée, essayer par NOM_FFVB
      if (!teams || teams.length === 0) {
        const result = await supabase
          .from('VEEC_Equipes_FFVB')
          .select('IDEQUIPE, NOM_FFVB')
          .ilike('NOM_FFVB', `%${args.team}%`);
        teams = result.data;
        teamError = result.error;
      }

      if (!teamError && teams && teams.length > 0) {
        teamIds = teams.map((t: any) => t.IDEQUIPE);
      }
    }

    let query = supabase
      .from('matches')
      .select(`
        *,
        equipe:VEEC_Equipes_FFVB!fk_matches_equipe(IDEQUIPE, NOM_FFVB)
      `)
      .order('Date', { ascending: true })
      .order('Heure', { ascending: true });

    if (args.startDate) {
      query = query.gte('Date', args.startDate);
    }
    if (args.endDate) {
      query = query.lte('Date', args.endDate);
    }
    if (args.competition) {
      query = query.ilike('Competition', `%${args.competition}%`);
    }
    if (teamIds.length > 0) {
      query = query.in('idequipe', teamIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données et calculer domicile/extérieur
    let matches = (data || []).map((match: any) => {
      // ✨ Utilisation de EQA_nom et EQB_nom pour déterminer domicile/extérieur
      // Si EQA_nom correspond à notre équipe → on joue à DOMICILE, adversaire = EQB_nom
      // Si EQB_nom correspond à notre équipe → on joue à EXTERIEUR, adversaire = EQA_nom
      const nomEquipeVEEC = match.equipe?.NOM_FFVB || '';

      // Comparaison stricte: chercher une correspondance exacte du nom d'équipe
      // Normaliser les espaces et la casse pour la comparaison
      const normalizeTeamName = (name: string) => name?.trim().toLowerCase() || '';
      const nomVEECNormalized = normalizeTeamName(nomEquipeVEEC);
      const eqaNormalized = normalizeTeamName(match.EQA_nom);
      const eqbNormalized = normalizeTeamName(match.EQB_nom);

      // Vérifier si notre équipe participe vraiment à ce match
      // (correction pour les matchs mal référencés dans la BDD)
      const teamParticipates = eqaNormalized === nomVEECNormalized || eqbNormalized === nomVEECNormalized;

      // On est à domicile si notre nom d'équipe correspond EXACTEMENT à EQA_nom
      const isHome = eqaNormalized === nomVEECNormalized;
      const adversaire = isHome ? match.EQB_nom : match.EQA_nom;

      return {
        id: match.idmatch,
        date: match.Date,
        heure: match.Heure,
        competition: match.Competition,
        equipeVEEC: nomEquipeVEEC || 'Équipe inconnue',
        numeroEquipe: match.equipe?.IDEQUIPE,
        adversaire: adversaire || 'Adversaire inconnu',
        domicileExterieur: isHome ? 'Domicile' : 'Exterieur',
        lieu: isHome ? 'à domicile' : 'à l\'extérieur',
        gymnase: match.Salle,  // Nom du gymnase/salle où se joue le match
        salle: match.Salle,    // Conservé pour compatibilité
        score: match.Score || null,
        sets: match.Set || null,
        total: match.Total || null,
        _teamParticipates: teamParticipates,  // Flag interne pour filtrage
      };
    });

    // IMPORTANT: Filtrer les matchs où l'équipe ne participe pas vraiment
    // (correction pour données mal référencées dans la BDD)
    matches = matches.filter((match: any) => match._teamParticipates);

    // Filtrer par location si spécifié
    if (args.location) {
      const locationFilter = args.location.toLowerCase();
      matches = matches.filter((match: any) =>
        match.domicileExterieur.toLowerCase() === locationFilter
      );
    }

    return {
      success: true,
      data: matches,
      count: matches.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des matchs',
    };
  }
}

// Fonction pour récupérer les équipes
async function getTeams(args: { search?: string }) {
  try {
    if (args.search) {
      // Chercher d'abord par NOM_FFVB
      let query = supabase
        .from('VEEC_Equipes_FFVB')
        .select('*')
        .ilike('NOM_FFVB', `%${args.search}%`)
        .order('NOM_FFVB', { ascending: true });

      const { data: nameResults, error: nameError } = await query;

      // Puis chercher par DIVISION
      query = supabase
        .from('VEEC_Equipes_FFVB')
        .select('*')
        .ilike('DIVISION', `%${args.search}%`)
        .order('NOM_FFVB', { ascending: true });

      const { data: divisionResults, error: divisionError } = await query;

      // Combiner les résultats et dédupliquer
      const allResults = [...(nameResults || []), ...(divisionResults || [])];
      const uniqueResults = Array.from(
        new Map(allResults.map(team => [team.IDEQUIPE, team])).values()
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

    // Si pas de recherche, retourner toutes les équipes
    let query = supabase
      .from('VEEC_Equipes_FFVB')
      .select('*')
      .order('NOM_FFVB', { ascending: true });

    const { data, error } = await query;

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
      error: error.message || 'Erreur lors de la récupération des équipes',
    };
  }
}

// Fonction pour récupérer les licenciés (joueurs)
async function getPlayers(args: { search?: string; team?: string }) {
  try {
    // Si on cherche par équipe, utiliser la table VEEC_Collectifs
    if (args.team) {
      // D'abord trouver l'ID de l'équipe VEEC
      // Essayer d'abord par IDEQUIPE
      let { data: teams, error: teamError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .select('IDEQUIPE, NOM_FFVB')
        .ilike('IDEQUIPE', `%${args.team}%`);

      // Si aucune équipe trouvée, essayer par NOM_FFVB
      if (!teams || teams.length === 0) {
        const result = await supabase
          .from('VEEC_Equipes_FFVB')
          .select('IDEQUIPE, NOM_FFVB')
          .ilike('NOM_FFVB', `%${args.team}%`);
        teams = result.data;
        teamError = result.error;
      }

      console.log('[getPlayers] Recherche équipe:', args.team);
      console.log('[getPlayers] Équipes trouvées:', teams);

      if (teamError) {
        console.error('[getPlayers] Erreur recherche équipe:', teamError);
        throw teamError;
      }

      if (!teams || teams.length === 0) {
        console.log('[getPlayers] Aucune équipe trouvée pour:', args.team);
        return {
          success: true,
          data: [],
          count: 0,
          message: `Aucune équipe trouvée avec le nom ou code "${args.team}"`,
        };
      }

      const teamIds = teams.map((t: any) => t.IDEQUIPE);
      console.log('[getPlayers] IDs équipes:', teamIds);

      // Récupérer les joueurs via la table VEEC_Collectifs avec JOIN automatique
      let collectifsQuery = supabase
        .from('VEEC_Collectifs')
        .select(`
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
        .in('equipe_id', teamIds);

      const { data: collectifs, error: collectifsError } = await collectifsQuery;

      console.log('[getPlayers] Collectifs récupérés:', collectifs);
      console.log('[getPlayers] Nombre de collectifs:', collectifs?.length);

      if (collectifsError) {
        console.error('[getPlayers] Erreur collectifs:', collectifsError);
        throw collectifsError;
      }

      // Transformer les données (déjà jointées grâce à la FK!)
      let results = (collectifs || []).map((c: any) => ({
        id: c.licencie?.id,
        numeroLicence: c.licencie?.Num_Licencie,
        nom: c.licencie?.Nom_Licencie,
        prenom: c.licencie?.Prenom_Licencie,
        categorie: c.licencie?.Categorie_licencie,
        numeroMaillot: c.numero_maillot,
        poste: c.poste,
        dateNaissance: c.licencie?.Date_Naissance_licencie,
      }));

      console.log('[getPlayers] Joueurs après mapping:', results);
      console.log('[getPlayers] Nombre de joueurs:', results.length);

      // Appliquer le filtre de recherche si fourni
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        results = results.filter((p: any) =>
          p.nom?.toLowerCase().includes(searchLower) ||
          p.prenom?.toLowerCase().includes(searchLower)
        );
      }

      return {
        success: true,
        data: results,
        count: results.length,
      };
    }

    // Si pas de filtre équipe, rechercher dans tous les licenciés
    if (args.search) {
      // Chercher d'abord par nom
      let queryNom = supabase
        .from('VEEC_Licencie')
        .select('*')
        .ilike('Nom_Licencie', `%${args.search}%`)
        .order('Nom_Licencie', { ascending: true })
        .order('Prenom_Licencie', { ascending: true });

      const { data: nomResults } = await queryNom;

      // Puis chercher par prénom
      let queryPrenom = supabase
        .from('VEEC_Licencie')
        .select('*')
        .ilike('Prenom_Licencie', `%${args.search}%`)
        .order('Nom_Licencie', { ascending: true })
        .order('Prenom_Licencie', { ascending: true });

      const { data: prenomResults } = await queryPrenom;

      // Combiner et dédupliquer
      const allResults = [...(nomResults || []), ...(prenomResults || [])];
      const uniquePlayers = Array.from(
        new Map(allResults.map(p => [p.id, p])).values()
      );

      return {
        success: true,
        data: uniquePlayers.map((player: any) => ({
          id: player.id,
          numeroLicence: player.Num_Licencie,
          nom: player.Nom_Licencie,
          prenom: player.Prenom_Licencie,
          categorie: player.Categorie_licencie,
          dateNaissance: player.Date_Naissance_licencie,
        })),
        count: uniquePlayers.length,
      };
    }

    // Sans recherche, retourner tous les licenciés
    let query = supabase
      .from('VEEC_Licencie')
      .select('*')
      .order('Nom_Licencie', { ascending: true })
      .order('Prenom_Licencie', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((player: any) => ({
        id: player.id,
        numeroLicence: player.Num_Licencie,
        nom: player.Nom_Licencie,
        prenom: player.Prenom_Licencie,
        categorie: player.Categorie_licencie,
        dateNaissance: player.Date_Naissance_licencie,
      })),
      count: data?.length || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des joueurs',
    };
  }
}

// Fonction pour récupérer les statistiques générales
async function getStatistics() {
  try {
    const [trainingSessions, matches, teams, players] = await Promise.all([
      supabase.from('training_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('idmatch', { count: 'exact', head: true }),
      supabase.from('VEEC_Equipes_FFVB').select('IDEQUIPE', { count: 'exact', head: true }),
      supabase.from('VEEC_Licencie').select('id', { count: 'exact', head: true }),
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
      error: error.message || 'Erreur lors de la récupération des statistiques',
    };
  }
}

// Export des définitions de fonctions pour le LLM
export const AI_FUNCTIONS: AIFunction[] = [
  {
    name: 'getCurrentDateTime',
    description: 'Obtient la date et l\'heure actuelles. Utile pour savoir quel jour on est, quelle heure il est.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: getCurrentDateTime,
  },
  {
    name: 'calculateDate',
    description: 'Calcule une date relative à aujourd\'hui. Utile pour "demain" (+1 jour), "hier" (-1 jour), "la semaine prochaine" (+1 semaine), etc.',
    parameters: {
      type: 'object',
      properties: {
        offset: {
          type: 'number',
          description: 'Décalage par rapport à aujourd\'hui (positif = futur, négatif = passé). Ex: 1 pour demain, -1 pour hier, 7 pour dans une semaine',
        },
        unit: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Unité de temps (day, week, month)',
        },
      },
      required: ['offset'],
    },
    execute: calculateDate,
  },
  {
    name: 'getTrainingSessions',
    description: 'Récupère la liste des entraînements. Permet de filtrer par équipe, jour ou gymnase.',
    parameters: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          description: 'Nom de l\'équipe (recherche partielle)',
        },
        day: {
          type: 'string',
          description: 'Jour de la semaine (lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche)',
        },
        gym: {
          type: 'string',
          description: 'Nom du gymnase',
        },
      },
    },
    execute: getTrainingSessions,
  },
  {
    name: 'getMatches',
    description: 'Récupère la liste des matchs des équipes VEEC avec toutes les informations: date, heure, adversaire, gymnase/salle, domicile ou extérieur, compétition. Permet de filtrer par équipe (SM1, SM2, SF1, U18M, etc.), dates, compétition et localisation (domicile/extérieur). IMPORTANT: utilise le nom ou numéro d\'équipe VEEC (ex: "SM1", "U18M", "SF1"). Le champ "gymnase" contient le nom du lieu où se joue le match.',
    parameters: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          description: 'Nom ou numéro de l\'équipe VEEC (ex: "SM1", "U18M", "SF1", "Seniors Masculins 1"). Cherche dans le nom complet et le numéro d\'équipe.',
        },
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD). Utilise calculateDate pour obtenir les dates relatives.',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD). Utilise calculateDate pour obtenir les dates relatives.',
        },
        competition: {
          type: 'string',
          description: 'Nom de la compétition (ex: "Régionale", "Nationale", "Départementale")',
        },
        location: {
          type: 'string',
          enum: ['domicile', 'exterieur'],
          description: 'Filtrer par localisation: "domicile" pour les matchs à domicile, "exterieur" pour les matchs à l\'extérieur',
        },
      },
    },
    execute: getMatches,
  },
  {
    name: 'getTeams',
    description: 'Récupère la liste des équipes du club VEEC avec leurs informations (nom complet, numéro, division, couleurs). Utile pour connaître toutes les équipes disponibles.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Terme de recherche partiel (nom complet, numéro d\'équipe comme "SM1", ou division comme "Régionale")',
        },
      },
    },
    execute: getTeams,
  },
  {
    name: 'getPlayers',
    description: 'Récupère les informations complètes des joueurs licenciés FFVB: numéro de licence, nom, prénom, date de naissance, catégorie (SEN, U18, etc.), équipe, numéro de maillot et poste. Permet de filtrer par nom/prénom ou par équipe (ex: "SM1", "U18M").',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Recherche par nom ou prénom du joueur (recherche partielle)',
        },
        team: {
          type: 'string',
          description: 'Filtrer par équipe VEEC (nom complet ou numéro comme "SM1", "U18M", "SF1")',
        },
      },
    },
    execute: getPlayers,
  },
  {
    name: 'getStatistics',
    description: 'Récupère les statistiques générales du club (nombre d\'entraînements, matchs, équipes, joueurs).',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: getStatistics,
  },
];

// Fonction utilitaire pour exécuter une fonction par son nom
export async function executeAIFunction(functionName: string, args: any): Promise<any> {
  const func = AI_FUNCTIONS.find(f => f.name === functionName);
  if (!func) {
    return {
      success: false,
      error: `Fonction "${functionName}" non trouvée`,
    };
  }
  return await func.execute(args);
}

// Conversion des fonctions au format attendu par les LLMs
export function getFunctionDefinitionsForOpenAI() {
  return AI_FUNCTIONS.map(func => ({
    name: func.name,
    description: func.description,
    parameters: func.parameters,
  }));
}

export function getFunctionDefinitionsForAnthropic() {
  return AI_FUNCTIONS.map(func => ({
    name: func.name,
    description: func.description,
    input_schema: func.parameters,
  }));
}

export function getFunctionDefinitionsForGemini() {
  return AI_FUNCTIONS.map(func => ({
    name: func.name,
    description: func.description,
    parameters: func.parameters,
  }));
}

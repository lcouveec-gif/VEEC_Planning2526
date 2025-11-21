
export interface TrainingSession {
  id: number;
  team: string;
  coach: string;
  day: string;
  gym: string;
  courts: string[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface Team {
  IDEQUIPE: string;
  URL_FFVB?: string;
  NOM_FFVB: string;
  NOM_CAL?: string;
  POULE_TEAM?: string;
  POULE_NOM?: string; // Nom du championnat/poule
  CURL_TEAM?: string;
  CALDAV_URL?: string;
  QRCODE_URL?: string;
  image_url?: string; // URL de l'image stockée dans Supabase Storage
}

export interface Match {
  id: string; // UUID dans Supabase
  idequipe?: string;
  NOM_CAL?: string;
  NOM_FFVB?: string;
  POULE_TEAM?: string;
  CALDAV_URL?: string;
  Entite?: string;
  Jo?: string;
  match?: string;
  Date?: string; // format date du match
  Heure?: string;
  EQA_no?: string;
  EQA_nom?: string; // Nom équipe A
  EQB_no?: string;
  EQB_nom?: string; // Nom équipe B
  Set?: string;
  Score?: string;
  Total?: string;
  Salle?: string;
  Arb1?: string;
  Arb2?: string;
  Championnat?: string;
  created_at?: string;
  updated_at?: string;
  equipe?: Team; // Relation avec la table VEEC_Equipes_FFVB
}

// Types pour la fonctionnalité Position
export type PlayerPosition = 'Passeur' | 'Libéro' | 'R4' | 'Pointu' | 'Central';

export type CourtPosition = 1 | 2 | 3 | 4 | 5 | 6 | 'Libéro' | 'Bench';

export interface Licencie {
  id: string; // UUID dans Supabase
  Nom_Licencie?: string;
  Prenom_Licencie: string;
  Num_Licencie?: string | number; // Peut être string ou number selon la DB
  Categorie_licencie?: string; // Catégorie du licencié (minuscule comme dans la DB)
  created_at?: string;
}

export interface Player {
  nom?: string;
  prenom: string;
  numero_licence?: string;
  numero_maillot: number; // Numéro de maillot (1-99)
  licencieId?: string; // UUID du licencié si sélectionné depuis la base
  defaultPosition: PlayerPosition;
}

export interface CourtPlayer {
  player: Player;
  position: CourtPosition;
}

export interface SetLineup {
  setNumber: number;
  players: CourtPlayer[];
  startsServing: boolean; // true = service, false = réception
}

export interface MatchPositionData {
  matchId: string; // UUID du match
  teamId: string;
  startDate: string;
  players: Player[]; // 12 joueurs
  setLineups: SetLineup[]; // De 3 à 5 sets
}

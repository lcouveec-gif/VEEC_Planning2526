
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
  CURL_TEAM?: string;
  CALDAV_URL?: string;
  QRCODE_URL?: string;
}

export interface Match {
  id: number;
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

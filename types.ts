
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

// Table VEEC_Equipes (équipe parent)
export interface Team {
  IDEQUIPE: string;
  NOM_EQUIPE?: string;
  image_url?: string;
  scorenco_url?: string;
}

// Table VEEC_Equipes_FFVB (inscription à un championnat)
export interface TeamFFVB {
  IDEQUIPE: string;
  POULE_TEAM: string; // Partie de la clé composite
  URL_FFVB?: string;
  NOM_FFVB?: string;
  NOM_CAL?: string;
  CURL_TEAM?: string;
  CALDAV_URL?: string;
  QRCODE_URL?: string;
  POULE_NOM?: string;
  image_url?: string;
  scorenco_url?: string;
}

// Équipe avec ses championnats (vue combinée)
export interface TeamWithChampionships extends Team {
  championships: TeamFFVB[];
}

// Table championnat (référentiel des championnats)
export interface Championnat {
  id: number;
  created_at?: string;
  code_championnat: string;
  nom_championnat?: string;
  url_championnat?: string;
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
  Competition?: string;
  Domicile_Exterieur?: string;
  Equipe_1?: string;
  Equipe_2?: string;
  created_at?: string;
  updated_at?: string;
  equipe?: Team; // Relation avec la table VEEC_Equipes
  equipe_ffvb?: TeamFFVB; // Relation avec la table VEEC_Equipes_FFVB
  championnat_obj?: Championnat; // Relation avec la table championnat (via equipe_ffvb.POULE_TEAM = code_championnat)
}

// Types pour la fonctionnalité Position
export type PlayerPosition = 'Passeur' | 'Libéro' | 'R4' | 'Pointu' | 'Central';

export type CourtPosition = 1 | 2 | 3 | 4 | 5 | 6 | 'Libéro' | 'Bench';

export interface Licencie {
  id: string; // UUID dans Supabase
  Nom_Licencie?: string;
  Prenom_Licencie: string;
  Num_Licencie?: string | number; // Peut être string ou number selon la DB
  Date_Naissance_licencie?: string; // Date de naissance (YYYY-MM-DD)
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

// Types pour la gestion des clubs adverses
export interface Club {
  code_club: string; // Code à 7 positions (ex: 0775819)
  nom: string; // Nom complet du club (sans numéro d'équipe)
  nom_court?: string; // Nom court/abréviation
  ville?: string;
  logo_url?: string; // URL du logo dans Supabase Storage (fichier: code_club.png)
  created_at?: string;
  updated_at?: string;
}

// ─── Module Stage ──────────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  nom: string;
  date_debut: string;          // YYYY-MM-DD
  date_fin: string;            // YYYY-MM-DD
  tarif_stage_interne?: number | null;
  tarif_stage_externe?: number | null;
  tarif_jour_interne?: number | null;
  tarif_jour_externe?: number | null;
  description?: string | null;
  gymnase?: string | null;
  created_at?: string;
}

export type StageCategorie = 'M11' | 'M13' | 'M15' | 'M18' | 'Senior';
export type StageGenre = 'Masculin' | 'Féminin';
export type StageNiveau = 'Débutant' | 'Confirmé' | 'Expert';
export type TypeInscription = 'stage_complet' | 'journee';
export type TypeParticipant = 'interne' | 'externe';

export type OrigineInscription = 'helloasso' | 'autre';
export type MoyenPaiement = 'helloasso' | 'especes' | 'sumup' | 'virement';

export interface PaiementLine {
  moyen: MoyenPaiement;
  montant: number;
  num_commande_helloasso?: string | null;
}

export interface StageInscription {
  id: string;
  stage_id: string;
  // Infos stagiaire
  nom?: string | null;
  prenom: string;
  categorie?: StageCategorie | null;
  genre?: StageGenre | null;
  niveau?: StageNiveau | null;
  num_licence?: string | null;
  // Infos inscription
  type_inscription: TypeInscription;
  type_participant: TypeParticipant;
  jours?: string[] | null;  // Dates précises de présence (YYYY-MM-DD[])
  nb_jours?: number | null; // Dérivé de jours.length (calculé automatiquement)
  montant?: number | null;
  notes?: string | null;
  // Traçabilité paiement
  origine_inscription?: OrigineInscription | null;
  num_commande_helloasso?: string | null;   // 1er paiement HelloAsso (rétrocompatibilité)
  moyen_paiement?: MoyenPaiement | null;    // moyen unique ou null si multi
  montant_regle?: number | null;            // somme de paiements[].montant
  email_commanditaire?: string | null;
  paiements?: PaiementLine[] | null;        // lignes de paiement (multi-moyen)
  created_at?: string;
}

export interface ImportInscriptionResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface StagePresence {
  id: string;
  stage_id: string;
  inscription_id: string;
  date: string;           // YYYY-MM-DD
  present: boolean;
  created_at?: string;
}

export interface StageGroupe {
  id: string;
  stage_id: string;
  date: string;           // YYYY-MM-DD
  nom: string;
  terrain?: string | null;
  created_at?: string;
}

export interface StageGroupeMembre {
  id: string;
  groupe_id: string;
  inscription_id: string;
  created_at?: string;
}

export type RoleStage = 'responsable' | 'encadrant';
export type RoleGroupeEncadrant = 'leader' | 'accompagnant';

export interface StageEncadrant {
  id: string;
  stage_id: string;
  licencie_id: string;
  jours?: string[] | null;         // null = tous les jours du stage
  role_stage?: RoleStage | null;   // responsable du stage ou simple encadrant
  indemnisation_jour?: number | null; // null = non rémunéré
  created_at?: string;
}

export interface StageGroupeEncadrant {
  id: string;
  groupe_id: string;
  encadrant_id: string;           // FK → stage_encadrants.id
  role: RoleGroupeEncadrant;
  created_at?: string;
}

// ─── Module Questionnaire Stage ──────────────────────────────────────────────

export type TypeQuestion = 'texte_libre' | 'note_5' | 'note_10' | 'oui_non' | 'date';

export interface QuestionnaireTemplate {
  id: string;
  nom: string;
  description?: string | null;
  created_at?: string;
}

export interface QuestionnaireQuestion {
  id: string;
  template_id: string;
  ordre: number;
  libelle: string;
  type_question: TypeQuestion;
  obligatoire: boolean;
  created_at?: string;
}

export interface QuestionnaireTemplateWithQuestions extends QuestionnaireTemplate {
  questions: QuestionnaireQuestion[];
}

export interface StageQuestionnaire {
  id: string;
  stage_id: string;
  template_id: string;
  created_at?: string;
  template?: QuestionnaireTemplateWithQuestions;
}

export interface QuestionnaireReponse {
  id: string;
  stage_questionnaire_id: string;
  inscription_id: string;
  soumis_le?: string;
  created_at?: string;
}

export interface QuestionnaireReponseDetail {
  id: string;
  reponse_id: string;
  question_id: string;
  valeur_texte?: string | null;
  valeur_note?: number | null;
  created_at?: string;
}

export interface QuestionnaireReponseComplete extends QuestionnaireReponse {
  details: QuestionnaireReponseDetail[];
}

export interface QuestionStats {
  question_id: string;
  libelle: string;
  type_question: TypeQuestion;
  nb_reponses: number;
  moyenne?: number;
  min?: number;
  max?: number;
  distribution?: Record<number, number>;
  textes?: string[];
}

export interface QuestionnaireStats {
  template_id: string;
  nom_template: string;
  stages: Array<{ stage_id: string; nom_stage: string; nb_reponses: number }>;
  total_reponses: number;
  questions: QuestionStats[];
}

// ─── Module Tournoi ───────────────────────────────────────────────────────────

export interface Tournoi {
  id: number;
  slug: string;
  nom: string;
  date_debut?: string | null;  // YYYY-MM-DD
  date_fin?: string | null;    // YYYY-MM-DD
  lieu?: string | null;
  created_at?: string;
}

export interface InscriptionTournoi {
  numero_billet: number;        // PK
  tournoi_id: number;
  reference_commande?: number | null;
  date_commande?: string | null;
  statut_commande?: string | null;
  nom_participant?: string | null;
  prenom_participant?: string | null;
  nom_payeur?: string | null;
  prenom_payeur?: string | null;
  email_payeur?: string | null;
  moyen_paiement?: string | null;
  tarif?: string | null;
  montant_tarif?: number | null;
  code_promo?: string | null;
  montant_code_promo?: number | null;
  custom_fields?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImportTournoiResult {
  upserted: number;
  errors: string[];
}

export interface CompetitionTournoi {
  id: number;
  tournoi_id: number;
  nom: string;
  tarifs_eligibles?: string[];
  nb_equipes?: number;    // calculé depuis le count Supabase
  created_at?: string;
}

export interface EquipeCompetitionTournoi {
  id: number;
  competition_id: number;
  nom_equipe: string;
  niveau_equipe?: string | null;
  is_staff?: boolean;
  numero_billet_capitaine?: number | null;
  nom_contact?: string | null;
  prenom_contact?: string | null;
  email_contact?: string | null;
  telephone_contact?: string | null;
  created_at?: string;
}

// ─── Types pour la gestion des gymnases ───────────────────────────────────────

export interface Gymnase {
  id: string; // UUID
  nom: string; // Nom du gymnase
  code_club?: string; // Code du club propriétaire (7 positions, ex: 0775819) - optionnel
  adresse?: string; // Adresse complète
  ville?: string; // Ville
  code_postal?: string; // Code postal
  latitude?: number; // Latitude GPS
  longitude?: number; // Longitude GPS
  notes?: string; // Notes supplémentaires
  created_at?: string;
  updated_at?: string;
  club?: Club; // Relation avec le club (via JOIN)
}

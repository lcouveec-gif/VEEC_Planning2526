-- ============================================================
--  VEEC Planning 2025/2026 — Schéma Supabase COMPLET
--  Généré le : 2026-03-10 (mis à jour)
--  Usage : recréer from scratch une base Supabase vierge
--
--  ORDRE D'EXÉCUTION OBLIGATOIRE (dépendances FK) :
--    1. Extensions
--    2. VEEC_Equipes
--    3. VEEC_Equipes_FFVB
--    4. VEEC_Licencie
--    5. championnat
--    6. matches  (vraie table actuelle)
--    7. VEEC_Collectifs
--    8. VEEC_Match_Positions
--    9. veec_profiles
--   10. user_llm_settings
--   11. clubs
--   12. gymnases  (FK → clubs)
--   13. stages
--   14. stage_inscriptions  (FK → stages)
--   15. stage_presences  (FK → stages, stage_inscriptions)
--   16. stage_groupes  (FK → stages)
--   17. stage_groupe_membres  (FK → stage_groupes, stage_inscriptions)
--   18. stage_encadrants  (FK → stages, VEEC_Licencie)
--   19. stage_groupe_encadrants  (FK → stage_groupes, stage_encadrants)
--   20. questionnaire_templates
--   21. questionnaire_questions  (FK → questionnaire_templates)
--   22. stage_questionnaires  (FK → stages, questionnaire_templates)
--   23. questionnaire_reponses  (FK → stage_questionnaires, stage_inscriptions)
--   24. questionnaire_reponses_details  (FK → questionnaire_reponses, questionnaire_questions)
--   25. tournois  (module Tournoi)
--   26. inscriptions_tournoi  (FK → tournois)
--   27. competitions_tournoi  (FK → tournois)
--   28. equipes_competitions_tournoi  (FK → competitions_tournoi)
--   29. webhooks
--   30. Fonctions et triggers
--   31. Politiques RLS
--   32. Fonction is_admin_user (helper RLS)
--
--  NOTES :
--  - RLS désactivé sur VEEC_Equipes (accès anonyme requis)
--  - NO FK en Supabase entre tables (joins faits côté JS)
--  - La table VEEC_Equipe_FFVB (supabase_matches_setup.sql) est
--    un ancien prototype non utilisé — on ne la recrée pas.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. VEEC_Equipes  (équipes parent)
-- ============================================================

CREATE TABLE IF NOT EXISTS "VEEC_Equipes" (
  "IDEQUIPE"     TEXT PRIMARY KEY,          -- ex: "0775819M1"
  "NOM_EQUIPE"   TEXT,
  image_url      TEXT,
  scorenco_url   TEXT
);

-- RLS DÉSACTIVÉ sur cette table (accès anonyme requis)
-- ALTER TABLE "VEEC_Equipes" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. VEEC_Equipes_FFVB  (inscription équipe × championnat)
--    Clé composite : IDEQUIPE + POULE_TEAM
-- ============================================================

CREATE TABLE IF NOT EXISTS "VEEC_Equipes_FFVB" (
  "IDEQUIPE"      TEXT    NOT NULL,
  "POULE_TEAM"    TEXT    NOT NULL,   -- = championnat.code_championnat
  "URL_FFVB"      TEXT,
  "NOM_FFVB"      TEXT,
  "NOM_CAL"       TEXT,
  "CURL_TEAM"     TEXT,
  "CALDAV_URL"    TEXT,
  "QRCODE_URL"    TEXT,
  "POULE_NOM"     TEXT,
  image_url       TEXT,
  scorenco_url    TEXT,
  PRIMARY KEY ("IDEQUIPE", "POULE_TEAM")
);

ALTER TABLE "VEEC_Equipes_FFVB" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read VEEC_Equipes_FFVB"
  ON "VEEC_Equipes_FFVB" FOR SELECT TO public USING (true);

CREATE POLICY "Auth write VEEC_Equipes_FFVB"
  ON "VEEC_Equipes_FFVB" FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 3. VEEC_Licencie  (licenciés du club)
-- ============================================================

CREATE TABLE IF NOT EXISTS "VEEC_Licencie" (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Nom_Licencie"           TEXT,
  "Prenom_Licencie"        TEXT NOT NULL,
  "Num_Licencie"           TEXT,          -- Numéro de licence (string ou nombre)
  "Date_Naissance_licencie" DATE,
  "Categorie_licencie"     TEXT,          -- ex: "m13", "m15", "senior"
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licencie_nom
  ON "VEEC_Licencie" ("Nom_Licencie", "Prenom_Licencie");

ALTER TABLE "VEEC_Licencie" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read licencies"
  ON "VEEC_Licencie" FOR SELECT TO public USING (true);

CREATE POLICY "Auth write licencies"
  ON "VEEC_Licencie" FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 4. championnat  (référentiel des championnats)
-- ============================================================

CREATE TABLE IF NOT EXISTS championnat (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  code_championnat  TEXT UNIQUE NOT NULL,  -- = VEEC_Equipes_FFVB.POULE_TEAM
  nom_championnat   TEXT,
  url_championnat   TEXT
);

ALTER TABLE championnat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read championnat"
  ON championnat FOR SELECT TO public USING (true);

CREATE POLICY "Auth write championnat"
  ON championnat FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 5. matches  (calendrier des matchs importé depuis FFVB/CalDAV)
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idequipe              TEXT,               -- → VEEC_Equipes.IDEQUIPE (pas de FK)
  "NOM_CAL"             TEXT,
  "NOM_FFVB"            TEXT,
  "POULE_TEAM"          TEXT,               -- → championnat.code_championnat
  "CALDAV_URL"          TEXT,
  "Entite"              TEXT,
  "Jo"                  TEXT,
  match                 TEXT,
  "Date"                DATE,
  "Heure"               TEXT,
  "EQA_no"              TEXT,
  "EQA_nom"             TEXT,
  "EQB_no"              TEXT,
  "EQB_nom"             TEXT,
  "Set"                 TEXT,
  "Score"               TEXT,
  "Total"               TEXT,
  "Salle"               TEXT,
  "Arb1"                TEXT,
  "Arb2"                TEXT,
  "Championnat"         TEXT,
  "Competition"         TEXT,
  "Domicile_Exterieur"  TEXT,
  "Equipe_1"            TEXT,
  "Equipe_2"            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_date     ON matches ("Date");
CREATE INDEX IF NOT EXISTS idx_matches_idequipe ON matches (idequipe);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read matches"
  ON matches FOR SELECT TO public USING (true);

CREATE POLICY "Auth write matches"
  ON matches FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 6. VEEC_Collectifs  (collectifs équipe × joueur)
-- ============================================================

CREATE TABLE IF NOT EXISTS "VEEC_Collectifs" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id       TEXT    NOT NULL,   -- → VEEC_Equipes.IDEQUIPE
  licencie_id     UUID    NOT NULL,   -- → VEEC_Licencie.id
  numero_maillot  INTEGER CHECK (numero_maillot IS NULL OR (numero_maillot >= 1 AND numero_maillot <= 99)),
  poste           TEXT,               -- 'Passeur','Libéro','R4','Pointu','Central'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (equipe_id, licencie_id)
);

CREATE INDEX IF NOT EXISTS idx_collectifs_equipe_id   ON "VEEC_Collectifs" (equipe_id);
CREATE INDEX IF NOT EXISTS idx_collectifs_licencie_id ON "VEEC_Collectifs" (licencie_id);

ALTER TABLE "VEEC_Collectifs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read collectifs"
  ON "VEEC_Collectifs" FOR SELECT TO public USING (true);

CREATE POLICY "Public write collectifs"
  ON "VEEC_Collectifs" FOR ALL TO public
  USING (true) WITH CHECK (true);


-- ============================================================
-- 7. VEEC_Match_Positions  (compositions par match)
-- ============================================================

CREATE TABLE IF NOT EXISTS "VEEC_Match_Positions" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID    NOT NULL,   -- → matches.id
  team_id     TEXT    NOT NULL,   -- → VEEC_Equipes.IDEQUIPE
  match_date  TIMESTAMPTZ,
  players     JSONB   NOT NULL,   -- array de Player
  set_lineups JSONB   DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_positions_match_id ON "VEEC_Match_Positions" (match_id);
CREATE INDEX IF NOT EXISTS idx_match_positions_team_id  ON "VEEC_Match_Positions" (team_id);

ALTER TABLE "VEEC_Match_Positions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read match positions"
  ON "VEEC_Match_Positions" FOR SELECT TO public USING (true);

CREATE POLICY "Public write match positions"
  ON "VEEC_Match_Positions" FOR ALL TO public
  USING (true) WITH CHECK (true);


-- ============================================================
-- 8. veec_profiles  (profils utilisateurs avec rôles)
-- ============================================================

CREATE TABLE IF NOT EXISTS veec_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'entraineur', 'user')),
  nom        TEXT,
  prenom     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_veec_profiles_user_id ON veec_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_email   ON veec_profiles (email);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_role    ON veec_profiles (role);

ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit son propre profil
CREATE POLICY "Users can view own profile"
  ON veec_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Chaque utilisateur peut créer son profil à l'inscription
CREATE POLICY "Allow insert during signup"
  ON veec_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chaque utilisateur peut modifier son propre profil (sauf le rôle)
CREATE POLICY "Users can update own profile"
  ON veec_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM veec_profiles WHERE user_id = auth.uid())
  );

-- Les admins voient tous les profils
CREATE POLICY "Admins can view all profiles"
  ON veec_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON veec_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE  veec_profiles      IS 'Profils utilisateurs VEEC avec gestion des rôles';
COMMENT ON COLUMN veec_profiles.role IS 'Rôle : admin (tout), entraineur (tout sauf autorisations), user (lecture seule)';


-- ============================================================
-- 9. user_llm_settings  (paramètres LLM chiffrés par utilisateur)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_llm_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,               -- 'openai', 'anthropic', 'google', 'custom'
  api_key_encrypted TEXT NOT NULL,               -- chiffré avec pgcrypto
  model             TEXT NOT NULL,
  endpoint          TEXT NOT NULL,
  temperature       NUMERIC DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens        INTEGER DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 32000),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_llm_settings_user_id ON user_llm_settings (user_id);

ALTER TABLE user_llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own LLM settings"
  ON user_llm_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE  user_llm_settings                  IS 'Paramètres LLM par utilisateur — clé API chiffrée';
COMMENT ON COLUMN user_llm_settings.api_key_encrypted IS 'Clé API chiffrée avec pgcrypto — ne jamais exposer côté client';
COMMENT ON COLUMN user_llm_settings.provider          IS 'Fournisseur LLM : openai, anthropic, google, custom';


-- ============================================================
-- 10. clubs  (clubs de volley avec logos)
-- ============================================================

CREATE TABLE IF NOT EXISTS clubs (
  code_club   TEXT PRIMARY KEY,   -- code à 7 positions (ex: 0775819)
  nom         TEXT NOT NULL,
  nom_court   TEXT,
  ville       TEXT,
  logo_url    TEXT,               -- URL dans Supabase Storage bucket 'club-logos'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_nom   ON clubs (nom);
CREATE INDEX IF NOT EXISTS idx_clubs_ville ON clubs (ville);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Lecture publique (y compris invités)
CREATE POLICY "Lecture publique des clubs"
  ON clubs FOR SELECT TO public USING (true);

-- Écriture réservée aux admin et entraîneurs
CREATE POLICY "Admin et entraineurs gèrent les clubs"
  ON clubs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE  clubs           IS 'Liste des clubs de volley avec logos';
COMMENT ON COLUMN clubs.code_club IS 'Code unique à 7 positions (ex: 0775819)';
COMMENT ON COLUMN clubs.logo_url  IS 'URL du logo dans Storage bucket "club-logos" (fichier: code_club.png)';

-- NOTE : créer le bucket 'club-logos' (public) dans Supabase Storage


-- ============================================================
-- 11. gymnases  (gymnases avec adresses et GPS)
-- ============================================================

CREATE TABLE IF NOT EXISTS gymnases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          TEXT NOT NULL UNIQUE,   -- extrait du champ Salle des matchs
  code_club    TEXT,                   -- FK optionnel → clubs.code_club
  adresse      TEXT,
  ville        TEXT,
  code_postal  TEXT,
  latitude     DECIMAL(10, 8),
  longitude    DECIMAL(11, 8),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (code_club) REFERENCES clubs (code_club) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gymnases_nom         ON gymnases (nom);
CREATE INDEX IF NOT EXISTS idx_gymnases_ville       ON gymnases (ville);
CREATE INDEX IF NOT EXISTS idx_gymnases_code_postal ON gymnases (code_postal);
CREATE INDEX IF NOT EXISTS idx_gymnases_code_club   ON gymnases (code_club);

ALTER TABLE gymnases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des gymnases"
  ON gymnases FOR SELECT TO public USING (true);

CREATE POLICY "Admin et entraineurs créent des gymnases"
  ON gymnases FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

CREATE POLICY "Admin et entraineurs modifient des gymnases"
  ON gymnases FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

CREATE POLICY "Admin et entraineurs suppriment des gymnases"
  ON gymnases FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE gymnases IS 'Gymnases avec adresses et coordonnées GPS';


-- ============================================================
-- 12. stages  (stages sportifs)
-- ============================================================

CREATE TABLE IF NOT EXISTS stages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                   TEXT NOT NULL,
  date_debut            DATE NOT NULL,
  date_fin              DATE NOT NULL,
  tarif_stage_interne   NUMERIC,
  tarif_stage_externe   NUMERIC,
  tarif_jour_interne    NUMERIC,
  tarif_jour_externe    NUMERIC,
  description           TEXT,
  gymnase               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stages"
  ON stages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 13. stage_inscriptions  (inscriptions des stagiaires)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_inscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id                UUID NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
  nom                     TEXT,
  prenom                  TEXT NOT NULL,
  categorie               TEXT CHECK (categorie IN ('M11', 'M13', 'M15', 'M18', 'Senior')),
  genre                   TEXT CHECK (genre IN ('Masculin', 'Féminin')),
  niveau                  TEXT CHECK (niveau IN ('Débutant', 'Confirmé', 'Expert')),
  num_licence             TEXT,
  type_inscription        TEXT NOT NULL CHECK (type_inscription IN ('stage_complet', 'journee')),
  type_participant        TEXT NOT NULL CHECK (type_participant IN ('interne', 'externe')),
  jours                   TEXT[],        -- YYYY-MM-DD[] dates de présence prévues
  nb_jours                INTEGER,       -- calculé = length(jours)
  montant                 NUMERIC,
  notes                   TEXT,
  -- Traçabilité paiement
  origine_inscription     TEXT CHECK (origine_inscription IN ('helloasso', 'autre')),
  num_commande_helloasso  TEXT,          -- ex: 168413774
  moyen_paiement          TEXT CHECK (moyen_paiement IN ('helloasso', 'especes', 'sumup', 'virement')),
  montant_regle           NUMERIC,       -- somme de paiements[].montant (calculé au save)
  email_commanditaire     TEXT,          -- email du parent / commanditaire
  paiements               JSONB,         -- [{moyen, montant, num_commande_helloasso?}] multi-paiement
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_inscriptions_stage_id ON stage_inscriptions (stage_id);

ALTER TABLE stage_inscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_inscriptions"
  ON stage_inscriptions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 14. stage_presences  (présences réelles jour par jour)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_presences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id        UUID NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
  inscription_id  UUID NOT NULL REFERENCES stage_inscriptions (id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  present         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (inscription_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stage_presences_stage_id       ON stage_presences (stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_presences_inscription_id ON stage_presences (inscription_id);

ALTER TABLE stage_presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_presences"
  ON stage_presences FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 15. stage_groupes  (groupes de travail par jour)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_groupes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id   UUID NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  nom        TEXT NOT NULL,
  terrain    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_groupes_stage_id ON stage_groupes (stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_groupes_date     ON stage_groupes (date);

ALTER TABLE stage_groupes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_groupes"
  ON stage_groupes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 16. stage_groupe_membres  (membres d'un groupe)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_groupe_membres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id       UUID NOT NULL REFERENCES stage_groupes (id) ON DELETE CASCADE,
  inscription_id  UUID NOT NULL REFERENCES stage_inscriptions (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (groupe_id, inscription_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_groupe_membres_groupe_id ON stage_groupe_membres (groupe_id);

ALTER TABLE stage_groupe_membres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_groupe_membres"
  ON stage_groupe_membres FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 17. stage_encadrants  (encadrants affectés à un stage)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_encadrants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id           UUID NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
  licencie_id        UUID NOT NULL,   -- → VEEC_Licencie.id (pas de FK formelle)
  jours              TEXT[],          -- NULL = tous les jours du stage
  role_stage         TEXT DEFAULT 'encadrant' CHECK (role_stage IN ('responsable', 'encadrant')),
  indemnisation_jour NUMERIC,         -- montant en € par jour ; NULL = non rémunéré
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stage_id, licencie_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_encadrants_stage_id ON stage_encadrants (stage_id);

ALTER TABLE stage_encadrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_encadrants"
  ON stage_encadrants FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 18. stage_groupe_encadrants  (encadrants affectés à un groupe)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_groupe_encadrants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id     UUID NOT NULL REFERENCES stage_groupes (id) ON DELETE CASCADE,
  encadrant_id  UUID NOT NULL,  -- → stage_encadrants.id (pas de FK formelle)
  role          TEXT NOT NULL DEFAULT 'accompagnant' CHECK (role IN ('leader', 'accompagnant')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (groupe_id, encadrant_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_groupe_encadrants_groupe_id ON stage_groupe_encadrants (groupe_id);

ALTER TABLE stage_groupe_encadrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_groupe_encadrants"
  ON stage_groupe_encadrants FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 19. questionnaire_templates  (modèles de questionnaire)
-- ============================================================

CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access questionnaire_templates"
  ON questionnaire_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 20. questionnaire_questions  (questions d'un modèle)
-- ============================================================

CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id     UUID NOT NULL REFERENCES questionnaire_templates (id) ON DELETE CASCADE,
  ordre                INTEGER NOT NULL DEFAULT 0,
  texte_question       TEXT NOT NULL,
  type_question        TEXT NOT NULL CHECK (type_question IN ('texte_libre', 'note_5', 'note_10', 'oui_non', 'date')),
  obligatoire          BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_questionnaire_id ON questionnaire_questions (questionnaire_id);

ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access questionnaire_questions"
  ON questionnaire_questions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 21. stage_questionnaires  (questionnaire affecté à un stage)
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_questionnaires (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id             UUID NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
  questionnaire_id     UUID NOT NULL REFERENCES questionnaire_templates (id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stage_id, questionnaire_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_questionnaires_stage_id ON stage_questionnaires (stage_id);

ALTER TABLE stage_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access stage_questionnaires"
  ON stage_questionnaires FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- 22. questionnaire_reponses  (réponse d'un participant à un questionnaire)
-- ============================================================

CREATE TABLE IF NOT EXISTS questionnaire_reponses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_questionnaire_id   UUID NOT NULL REFERENCES stage_questionnaires (id) ON DELETE CASCADE,
  inscription_id           UUID,  -- → stage_inscriptions.id (pas de FK formelle)
  repondant_nom            TEXT,
  repondant_prenom         TEXT,
  repondant_categorie      TEXT,
  submitted_at             TIMESTAMPTZ DEFAULT NOW(),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_reponses_stage_questionnaire_id ON questionnaire_reponses (stage_questionnaire_id);

ALTER TABLE questionnaire_reponses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access questionnaire_reponses"
  ON questionnaire_reponses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Politique publique pour la soumission de réponses (participants non authentifiés)
CREATE POLICY "Public submit questionnaire_reponses"
  ON questionnaire_reponses FOR INSERT TO anon
  WITH CHECK (true);


-- ============================================================
-- 23. questionnaire_reponses_details  (détail par question)
-- ============================================================

CREATE TABLE IF NOT EXISTS questionnaire_reponses_details (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reponse_id      UUID NOT NULL REFERENCES questionnaire_reponses (id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questionnaire_questions (id) ON DELETE CASCADE,
  valeur_note     INTEGER,                -- pour note_5 / note_10
  valeur_texte    TEXT,                   -- pour texte_libre / oui_non / date
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reponse_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_reponses_details_reponse_id ON questionnaire_reponses_details (reponse_id);

ALTER TABLE questionnaire_reponses_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access questionnaire_reponses_details"
  ON questionnaire_reponses_details FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Politique publique pour la soumission de réponses (participants non authentifiés)
CREATE POLICY "Public submit questionnaire_reponses_details"
  ON questionnaire_reponses_details FOR INSERT TO anon
  WITH CHECK (true);


-- ============================================================
-- 24. FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction générique pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
DROP TRIGGER IF EXISTS update_veec_profiles_updated_at       ON veec_profiles;
DROP TRIGGER IF EXISTS update_user_llm_settings_updated_at   ON user_llm_settings;
DROP TRIGGER IF EXISTS update_collectifs_updated_at          ON "VEEC_Collectifs";
DROP TRIGGER IF EXISTS update_match_positions_updated_at     ON "VEEC_Match_Positions";
DROP TRIGGER IF EXISTS clubs_updated_at                      ON clubs;
DROP TRIGGER IF EXISTS gymnases_updated_at                   ON gymnases;

CREATE TRIGGER update_veec_profiles_updated_at
  BEFORE UPDATE ON veec_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_llm_settings_updated_at
  BEFORE UPDATE ON user_llm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collectifs_updated_at
  BEFORE UPDATE ON "VEEC_Collectifs"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_positions_updated_at
  BEFORE UPDATE ON "VEEC_Match_Positions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gymnases_updated_at
  BEFORE UPDATE ON gymnases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 20. FONCTIONS LLM (pgcrypto requis)
-- ============================================================

-- Récupérer les paramètres LLM déchiffrés (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_llm_settings_decrypted(
  p_user_id       UUID,
  p_encryption_key TEXT
)
RETURNS TABLE (
  provider          TEXT,
  api_key_decrypted TEXT,
  model             TEXT,
  endpoint          TEXT,
  temperature       NUMERIC,
  max_tokens        INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.provider,
    pgp_sym_decrypt(s.api_key_encrypted::BYTEA, p_encryption_key)::TEXT,
    s.model,
    s.endpoint,
    s.temperature,
    s.max_tokens
  FROM user_llm_settings s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_llm_settings_decrypted TO authenticated;

-- UPSERT paramètres LLM avec chiffrement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION upsert_user_llm_settings(
  p_user_id        UUID,
  p_provider       TEXT,
  p_api_key        TEXT,
  p_model          TEXT,
  p_endpoint       TEXT,
  p_temperature    NUMERIC,
  p_max_tokens     INTEGER,
  p_encryption_key TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_llm_settings (
    user_id, provider, api_key_encrypted, model, endpoint, temperature, max_tokens
  ) VALUES (
    p_user_id,
    p_provider,
    pgp_sym_encrypt(p_api_key, p_encryption_key),
    p_model,
    p_endpoint,
    p_temperature,
    p_max_tokens
  )
  ON CONFLICT (user_id) DO UPDATE SET
    provider          = EXCLUDED.provider,
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    model             = EXCLUDED.model,
    endpoint          = EXCLUDED.endpoint,
    temperature       = EXCLUDED.temperature,
    max_tokens        = EXCLUDED.max_tokens,
    updated_at        = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_user_llm_settings TO authenticated;


-- ============================================================
-- 21. FONCTION HELPER : is_admin_user()
--     Évite la récursion RLS sur veec_profiles pour les politiques
--     qui vérifient si l'utilisateur est admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Correction politique SELECT veec_profiles pour les admins
-- (remplace la politique récursive par la version SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can view all profiles" ON veec_profiles;

CREATE POLICY "Admins can view all profiles"
  ON veec_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_user());


-- ============================================================
-- 25. tournois  (module Tournoi — liste des tournois)
-- ============================================================

CREATE TABLE IF NOT EXISTS tournois (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,     -- identifiant URL (ex: green_veec_2026)
  nom         TEXT NOT NULL,
  date_debut  DATE,
  date_fin    DATE,
  lieu        TEXT,
  logo_url    TEXT,                     -- URL dans Storage VEEC_Media/tournoi-logos/
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des tournois"
  ON tournois FOR SELECT TO public USING (true);

CREATE POLICY "Admin et entraineurs gèrent les tournois"
  ON tournois FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE  tournois          IS 'Tournois organisés par VEEC';
COMMENT ON COLUMN tournois.slug     IS 'Identifiant URL unique (ex: green_veec_2026)';
COMMENT ON COLUMN tournois.logo_url IS 'URL du logo dans Storage VEEC_Media/tournoi-logos/{slug}.{ext}';


-- ============================================================
-- 26. inscriptions_tournoi  (billets HelloAsso ou manuels)
-- ============================================================

CREATE TABLE IF NOT EXISTS inscriptions_tournoi (
  numero_billet         INTEGER PRIMARY KEY,              -- PK : numéro de billet HelloAsso ou manuel (négatif)
  tournoi_id            INTEGER NOT NULL,                 -- → tournois.id (pas de FK formelle)
  reference_commande    INTEGER,                          -- NULL = inscription manuelle
  date_commande         TIMESTAMPTZ,
  statut_commande       TEXT,                             -- 'Validée','Annulée','Processed','Refunded'…
  nom_participant       TEXT,
  prenom_participant    TEXT,
  nom_payeur            TEXT,
  prenom_payeur         TEXT,
  email_payeur          TEXT,
  moyen_paiement        TEXT,
  tarif                 TEXT,
  montant_tarif         NUMERIC,
  code_promo            TEXT,
  montant_code_promo    NUMERIC,
  custom_fields         JSONB,                            -- champs libres HelloAsso (nom_equipe, niveau_equipe, clubs_origine…)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inscriptions_tournoi_tournoi_id      ON inscriptions_tournoi (tournoi_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_tournoi_statut          ON inscriptions_tournoi (statut_commande);
CREATE INDEX IF NOT EXISTS idx_inscriptions_tournoi_reference       ON inscriptions_tournoi (reference_commande);

ALTER TABLE inscriptions_tournoi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des inscriptions tournoi"
  ON inscriptions_tournoi FOR SELECT TO public USING (true);

CREATE POLICY "Admin et entraineurs gèrent les inscriptions tournoi"
  ON inscriptions_tournoi FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE  inscriptions_tournoi              IS 'Inscriptions HelloAsso ou manuelles pour un tournoi';
COMMENT ON COLUMN inscriptions_tournoi.numero_billet IS 'PK : numéro HelloAsso (positif) ou manuel (négatif, généré côté JS)';
COMMENT ON COLUMN inscriptions_tournoi.custom_fields IS 'Champs libres HelloAsso : nom_equipe, niveau_equipe, equipe, clubs_origine, email, telephone, commentaire';


-- ============================================================
-- 27. competitions_tournoi  (compétitions dans un tournoi)
-- ============================================================

CREATE TABLE IF NOT EXISTS competitions_tournoi (
  id               BIGSERIAL PRIMARY KEY,
  tournoi_id       INTEGER NOT NULL,         -- → tournois.id (pas de FK formelle)
  nom              TEXT NOT NULL,
  tarifs_eligibles TEXT[],                   -- tarifs HelloAsso rattachés à cette compétition
  nb_joueurs       INTEGER,                  -- nb théorique de joueurs par équipe (ex: 4, 6)
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitions_tournoi_tournoi_id ON competitions_tournoi (tournoi_id);

ALTER TABLE competitions_tournoi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des compétitions tournoi"
  ON competitions_tournoi FOR SELECT TO public USING (true);

CREATE POLICY "Admin et entraineurs gèrent les compétitions tournoi"
  ON competitions_tournoi FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE  competitions_tournoi              IS 'Compétitions/catégories au sein d'un tournoi';
COMMENT ON COLUMN competitions_tournoi.nb_joueurs   IS 'Nombre théorique de joueurs par équipe (pour calcul total joueurs)';
COMMENT ON COLUMN competitions_tournoi.tarifs_eligibles IS 'Liste des tarifs HelloAsso rattachés à cette compétition';


-- ============================================================
-- 28. equipes_competitions_tournoi  (équipes inscrites par compétition)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipes_competitions_tournoi (
  id                      BIGSERIAL PRIMARY KEY,
  competition_id          INTEGER NOT NULL,   -- → competitions_tournoi.id
  nom_equipe              TEXT NOT NULL,
  niveau_equipe           TEXT,               -- ex: Régionale, Départementale, Loisir
  is_staff                BOOLEAN DEFAULT false,
  numero_billet_capitaine INTEGER,            -- → inscriptions_tournoi.numero_billet
  nom_contact             TEXT,
  prenom_contact          TEXT,
  email_contact           TEXT,
  telephone_contact       TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (competition_id) REFERENCES competitions_tournoi (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_equipes_comp_tournoi_competition_id ON equipes_competitions_tournoi (competition_id);

ALTER TABLE equipes_competitions_tournoi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des équipes tournoi"
  ON equipes_competitions_tournoi FOR SELECT TO public USING (true);

CREATE POLICY "Admin et entraineurs gèrent les équipes tournoi"
  ON equipes_competitions_tournoi FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE equipes_competitions_tournoi IS 'Équipes inscrites dans une compétition d'un tournoi';


-- ============================================================
-- 29. webhooks  (webhooks sortants pour import HelloAsso)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  method      TEXT NOT NULL DEFAULT 'POST'
              CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  auth_type   TEXT NOT NULL DEFAULT 'none'
              CHECK (auth_type IN ('none', 'bearer', 'basic', 'header')),
  auth_value  TEXT,                           -- bearer: token | basic: "user:pass" | header: "HeaderName:value"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin et entraineurs gèrent les webhooks"
  ON webhooks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM veec_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur'))
  );

COMMENT ON TABLE webhooks IS 'Webhooks sortants (ex: import HelloAsso vers inscriptions_tournoi)';


-- ============================================================
-- 30. STORAGE BUCKETS  (à créer manuellement dans Supabase UI)
-- ============================================================

-- Bucket 'club-logos'   → public, pour les logos des clubs adverses
--   INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true)
--   ON CONFLICT (id) DO NOTHING;
--
-- Bucket 'VEEC_Media'   → public, pour les images équipes VEEC ET logos tournois
--   Sous-dossiers : team-images/  →  logos des équipes VEEC
--                   tournoi-logos/ → logos des tournois ({slug}.{ext})
--   INSERT INTO storage.buckets (id, name, public) VALUES ('VEEC_Media', 'VEEC_Media', true)
--   ON CONFLICT (id) DO NOTHING;
--
-- Politiques de stockage (à créer dans Supabase UI ou via SQL) :
--   CREATE POLICY "Public read club logos"
--     ON storage.objects FOR SELECT TO public
--     USING (bucket_id = 'club-logos');
--   CREATE POLICY "Auth write club logos"
--     ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'club-logos');
--
--   CREATE POLICY "Public read VEEC_Media"
--     ON storage.objects FOR SELECT TO public
--     USING (bucket_id = 'VEEC_Media');
--   CREATE POLICY "Auth write VEEC_Media"
--     ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'VEEC_Media');
--   CREATE POLICY "Auth update VEEC_Media"
--     ON storage.objects FOR UPDATE TO authenticated
--     USING (bucket_id = 'VEEC_Media');


-- ============================================================
-- 23. PREMIER UTILISATEUR ADMIN
--     Après avoir créé un compte via l'interface /login,
--     exécuter ce UPDATE pour lui attribuer le rôle admin :
-- ============================================================

-- UPDATE veec_profiles SET role = 'admin' WHERE email = 'votre@email.com';


-- ============================================================
-- FIN DU SCRIPT
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schéma VEEC Planning créé avec succès';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées :';
  RAISE NOTICE '  - VEEC_Equipes, VEEC_Equipes_FFVB, VEEC_Licencie';
  RAISE NOTICE '  - championnat, matches';
  RAISE NOTICE '  - VEEC_Collectifs, VEEC_Match_Positions';
  RAISE NOTICE '  - veec_profiles, user_llm_settings';
  RAISE NOTICE '  - clubs, gymnases';
  RAISE NOTICE '  - stages, stage_inscriptions, stage_presences';
  RAISE NOTICE '  - stage_groupes, stage_groupe_membres';
  RAISE NOTICE '  - stage_encadrants, stage_groupe_encadrants';
  RAISE NOTICE '  - questionnaire_templates, questionnaire_questions';
  RAISE NOTICE '  - stage_questionnaires, questionnaire_reponses, questionnaire_reponses_details';
  RAISE NOTICE '  - tournois, inscriptions_tournoi, competitions_tournoi';
  RAISE NOTICE '  - equipes_competitions_tournoi, webhooks';
  RAISE NOTICE '';
  RAISE NOTICE 'Étapes post-installation :';
  RAISE NOTICE '  1. Créer les buckets Storage : club-logos (public), VEEC_Media (public)';
  RAISE NOTICE '  2. Créer un compte via /login';
  RAISE NOTICE '  3. UPDATE veec_profiles SET role = ''admin'' WHERE email = ''...''';
END $$;

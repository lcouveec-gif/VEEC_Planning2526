// Types pour le module Arbitre

export type PlayerPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
export type PlayerRole = 'Passeur' | 'Pointu' | 'R4' | 'Central' | 'Libéro';

export interface RefereePlayer {
  number: string; // 01 à 99
  position: PlayerPosition;
  role: PlayerRole;
  isLibero: boolean;
  isCaptain: boolean;
}

export interface TeamInfo {
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  players: RefereePlayer[];
}

export type CoinTossChoice = 'service' | 'reception' | 'terrain';

export interface CoinTossResult {
  winner: 'A' | 'B';
  choice: CoinTossChoice;
}

export interface SetLineup {
  P1: string; // numéro du joueur
  P2: string;
  P3: string;
  P4: string;
  P5: string;
  P6: string;
}

export interface SetScore {
  teamA: number;
  teamB: number;
}

export interface LiberoExchange {
  liberoNumber: string;
  replacedPlayerNumber: string;
  replacedAtPosition: PlayerPosition;
}

export interface SetData {
  number: number; // 1, 2, 3, 4, 5
  lineupA: SetLineup;
  lineupB: SetLineup;
  score: SetScore;
  servingTeam: 'A' | 'B';
  started: boolean;
  finished: boolean;
  liberoExchangeA?: LiberoExchange;
  liberoExchangeB?: LiberoExchange;
}

export interface MatchData {
  teamA: TeamInfo;
  teamB: TeamInfo;
  coinToss?: CoinTossResult;
  sets: SetData[];
  currentSet: number;
  setsWon: {
    A: number;
    B: number;
  };
}

export type RefereeStep = 'setup' | 'coinToss' | 'match';

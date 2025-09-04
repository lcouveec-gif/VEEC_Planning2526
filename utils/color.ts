import { COLOR_PALETTE } from '../constants';
import { scheduleData } from '../data/scheduleData';

const teamColorMap = new Map<string, string>();

const initializeColorMap = () => {
  // Get unique team names and sort them for consistent color assignment
  const uniqueTeams = [...new Set(scheduleData.map(session => session.team))].sort();

  if (uniqueTeams.length > COLOR_PALETTE.length) {
    console.warn('More unique teams than available colors. Some teams will share colors.');
  }

  uniqueTeams.forEach((team, index) => {
    // Assign a color from the palette, wrapping around if there are more teams than colors
    teamColorMap.set(team, COLOR_PALETTE[index % COLOR_PALETTE.length]);
  });
};

// Initialize the color map when the module is first loaded
initializeColorMap();

/**
 * Gets a consistent, unique color from the palette for a given team name.
 * @param teamName The name of the team.
 * @returns A Tailwind CSS background color class string.
 */
export const getTeamColor = (teamName: string): string => {
  return teamColorMap.get(teamName) || COLOR_PALETTE[0]; // Fallback to a default color
};

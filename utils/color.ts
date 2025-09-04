import { scheduleData } from '../data/scheduleData';
import type { TrainingSession } from '../types';

/**
 * Converts a single channel of an sRGB color to linear RGB.
 */
const sRGBtoLin = (colorChannel: number): number => {
  if (colorChannel <= 0.03928) {
    return colorChannel / 12.92;
  } else {
    return Math.pow((colorChannel + 0.055) / 1.055, 2.4);
  }
};

/**
 * Calculates the relative luminance of a color.
 */
const getLuminance = (hexColor: string): number => {
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const R = sRGBtoLin(r);
  const G = sRGBtoLin(g);
  const B = sRGBtoLin(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

/**
 * Calculates the contrast ratio between two colors.
 */
const getContrast = (hex1: string, hex2: string): number => {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};


/**
 * Converts an HSL color value to a hex string.
 */
const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

type ColorStyle = { backgroundColor: string; color: string };

/**
 * Generates a list of visually distinct HSL colors using the golden angle.
 * This ensures colors are maximally separated on the color wheel.
 * @param count The number of colors to generate.
 */
const generateDistinctHslColors = (count: number): { h: number; s: number; l: number }[] => {
    const colors: { h: number; s: number; l: number }[] = [];
    const goldenAngle = 137.5;
    let hue = Math.random() * 360; // Start with a random hue for variety

    const saturation = 70; // A good, vibrant saturation level
    const lightness = 55;  // A mid-range lightness for good contrast potential

    for (let i = 0; i < count; i++) {
        hue = (hue + goldenAngle) % 360;
        colors.push({ h: hue, s: saturation, l: lightness });
    }
    
    return colors;
};

/**
 * Creates a map of team names to unique, accessible color styles.
 * This function is executed once to pre-compute all colors, guaranteeing uniqueness.
 * @param sessions The list of all training sessions.
 */
const createTeamColorMap = (sessions: TrainingSession[]): Map<string, ColorStyle> => {
    // 1. Get all unique team names, sorted for consistent color assignment
    const uniqueTeams = [...new Set(sessions.map(s => s.team))].sort();
    const colorMap = new Map<string, ColorStyle>();

    // 2. Generate a palette of visually distinct colors
    const colorPalette = generateDistinctHslColors(uniqueTeams.length);

    // 3. Assign each team a unique color and determine the best contrast text color
    uniqueTeams.forEach((teamName, index) => {
        const { h, s, l } = colorPalette[index];
        const backgroundColor = hslToHex(h, s, l);
        
        // Determine the best text color for accessibility
        const contrastWithWhite = getContrast(backgroundColor, '#FFFFFF');
        const contrastWithBlack = getContrast(backgroundColor, '#000000');
        const textColor = contrastWithWhite > contrastWithBlack ? '#FFFFFF' : '#000000';
        
        colorMap.set(teamName, { backgroundColor, color: textColor });
    });
    
    // Add a default for safety, although it should not be needed with this approach.
    colorMap.set('DEFAULT', { backgroundColor: '#6c757d', color: '#FFFFFF' });

    return colorMap;
};

// --- SINGLE SOURCE OF TRUTH FOR COLORS ---
// Pre-compute the color map for the entire application when this module is loaded.
const teamColorMap = createTeamColorMap(scheduleData);

/**
 * Retrieves the pre-generated, unique color style for a given team.
 * This is a simple and high-performance lookup function.
 * @param teamName The name of the team.
 */
export const getTeamColorStyles = (teamName: string): ColorStyle => {
  return teamColorMap.get(teamName) || teamColorMap.get('DEFAULT')!;
};

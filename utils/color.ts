/**
 * Converts a single channel of an sRGB color to linear RGB.
 * @param colorChannel Value of the color channel (0-1).
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
 * @param hexColor The color in hex format (e.g., "#RRGGBB").
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
 * @param hex1 First color in hex format.
 * @param hex2 Second color in hex format.
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
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
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

/**
 * Generates a consistent number hash from a string.
 * @param text The input string.
 */
const generateNumberFromText = (text: string): number => {
    let hash = 0;
    if (text.length === 0) return hash;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

type TeamGroup = 'SM' | 'SF' | 'M18' | 'M15' | 'M13' | 'LOISIRS' | 'ASSIS' | 'BABY' | 'SANTE' | 'M11' | 'DEFAULT';

// Define the base color palette for each team group
const GROUP_PALETTES: Record<TeamGroup, { baseHue: number, saturation: number }> = {
    'SM':      { baseHue: 220, saturation: 75 }, // Blues
    'SF':      { baseHue: 340, saturation: 75 }, // Pinks/Reds
    'M18':     { baseHue: 275, saturation: 70 }, // Purples
    'M15':     { baseHue: 140, saturation: 70 }, // Greens
    'M13':     { baseHue: 40,  saturation: 80 }, // Oranges
    'M11':     { baseHue: 60, saturation: 75 }, // Yellows
    'LOISIRS': { baseHue: 180, saturation: 65 }, // Teals
    'ASSIS':   { baseHue: 50,  saturation: 85 }, // Gold
    'BABY':    { baseHue: 195, saturation: 70 }, // Light Blue/Cyan
    'SANTE':   { baseHue: 200, saturation: 20 }, // Slate/Gray-Blue
    'DEFAULT': { baseHue: 0,   saturation: 0  }, // Gray
};

/**
 * Identifies the group a team belongs to based on its name.
 * @param teamName The name of the team.
 */
const getTeamGroup = (teamName: string): TeamGroup => {
    const name = teamName.toLowerCase();
    if (name.startsWith('sm')) return 'SM';
    if (name.startsWith('sf')) return 'SF';
    if (name.startsWith('m18')) return 'M18';
    if (name.startsWith('m15')) return 'M15';
    if (name.startsWith('m13')) return 'M13';
    if (name.startsWith('m11')) return 'M11';
    if (name.startsWith('loisir')) return 'LOISIRS';
    if (name.includes('vb assis')) return 'ASSIS';
    if (name.startsWith('baby-volley')) return 'BABY';
    if (name.startsWith('soft volley')) return 'SANTE';
    return 'DEFAULT';
};

/**
 * Generates an accessible color pair (background and text) from a string.
 * It ensures the contrast ratio meets WCAG AA standards (4.5:1).
 * @param text The string to generate the color from (e.g., team name).
 */
export const getTeamColorStyles = (text: string): { backgroundColor: string; color: string } => {
  const group = getTeamGroup(text);
  const palette = GROUP_PALETTES[group];
  
  const hash = generateNumberFromText(text);
  // Create a small, consistent hue variation within the group palette for each team
  const hueOffset = hash % 20 - 10; // +/- 10 degrees of hue variation
  const finalHue = (palette.baseHue + hueOffset + 360) % 360; // Ensure hue is within 0-360 range
  
  const saturation = palette.saturation;
  // Add a slight lightness variation to better distinguish teams in the same group
  const lightnessOffset = (Math.abs(hash) % 10) - 5; // +/- 5%
  let lightness = 50 + lightnessOffset; // Start from a mid-point lightness for better variation
  const minContrast = 4.5;
  
  let backgroundColor = hslToHex(finalHue, saturation, lightness);
  
  // Determine which text color provides better contrast initially
  const contrastWithWhite = getContrast(backgroundColor, '#FFFFFF');
  const contrastWithBlack = getContrast(backgroundColor, '#000000');
  
  const initialTextColor = contrastWithWhite > contrastWithBlack ? '#FFFFFF' : '#000000';
  let currentContrast = Math.max(contrastWithWhite, contrastWithBlack);
  
  // Determine adjustment direction for lightness
  const adjustment = initialTextColor === '#FFFFFF' ? -2.5 : 2.5;

  let iteration = 0;
  const maxIterations = 20; // Failsafe to prevent infinite loops

  // Adjust lightness until the minimum contrast with the chosen text color is met
  while (currentContrast < minContrast && iteration < maxIterations && lightness > 0 && lightness < 100) {
    lightness += adjustment;
    backgroundColor = hslToHex(finalHue, saturation, lightness);
    currentContrast = getContrast(backgroundColor, initialTextColor);
    iteration++;
  }
  
  // After adjusting the background, re-evaluate the best text color one last time
  const finalContrastWithWhite = getContrast(backgroundColor, '#FFFFFF');
  const finalContrastWithBlack = getContrast(backgroundColor, '#000000');
  const finalTextColor = finalContrastWithWhite > finalContrastWithBlack ? '#FFFFFF' : '#000000';

  return {
    backgroundColor,
    color: finalTextColor,
  };
};

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const GYMS = ['Coupvray', 'Magny', 'Esbly', 'Chessy'];
export const COURTS = ['T1', 'T2', 'T3'];

// Configuration des adresses des gymnases
export const GYM_ADDRESSES: Record<string, {
  name: string;
  address: string;
  wazeUrl: string;
  googleMapsUrl: string;
}> = {
  'coupvray': {
    name: 'Gymnase David Douillet',
    address: '73 Rue de Lesches, 77700 Coupvray',
    wazeUrl: 'https://waze.com/ul?q=73%20Rue%20de%20Lesches%2077700%20Coupvray',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=73+Rue+de+Lesches+77700+Coupvray'
  },
  'magny': {
    name: 'Halle des sports Alexis Vastine',
    address: '69 Rue des Labours, 77700 Magny-le-Hongre',
    wazeUrl: 'https://waze.com/ul?q=69%20Rue%20des%20Labours%2077700%20Magny-le-Hongre',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=69+Rue+des+Labours+77700+Magny-le-Hongre'
  },
  'esbly': {
    name: 'Collège Louis Braille',
    address: '27 Rue Louis Braille, 77450 Esbly',
    wazeUrl: 'https://waze.com/ul?q=27%20Rue%20Louis%20Braille%2077450%20Esbly',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=27+Rue+Louis+Braille+77450+Esbly'
  },
  'chessy': {
    name: 'Gymnase Bicheret',
    address: '2 Chemin du Bicheret, 77700 Chessy',
    wazeUrl: 'https://waze.com/ul?q=2%20Chemin%20du%20Bicheret%2077700%20Chessy',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=2+Chemin+du+Bicheret+77700+Chessy'
  }
};

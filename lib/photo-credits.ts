import credits from '@/public/cars/credits.json';

export interface PhotoCredit {
  image: string;
  model: string;
  title: string;
  author: string;
  license: string;
  source: string;
  mirrored: boolean;
  plateBlurred: boolean;
}

const LICENSES: Record<string, string> = {
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
};

/**
 * Attribution for the fleet photographs.
 *
 * Every seeded photo is a Wikimedia Commons image under a Creative Commons
 * licence, cut out and composited onto the studio backdrop. The licences
 * require the author, the licence and a note that it was changed; this is
 * where the pages get that from. Keyed by the image path, so a car whose
 * photo an admin replaces simply stops showing a credit.
 */
export const PHOTO_CREDITS: readonly PhotoCredit[] = credits;

export function photoCredit(imageUrl: string | null): PhotoCredit | null {
  if (!imageUrl) return null;
  return PHOTO_CREDITS.find((c) => c.image === imageUrl) ?? null;
}

export function licenseUrl(license: string): string | null {
  return LICENSES[license] ?? null;
}

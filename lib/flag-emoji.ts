/**
 * Convert an ISO 3166-1 alpha-2 country code (e.g. "SE", "us") to its flag emoji.
 * Returns an empty string if the code is malformed.
 */
export function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const upper = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  // Regional Indicator Symbol Letter A = U+1F1E6; offset from 'A' (65) = 127397
  return upper
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

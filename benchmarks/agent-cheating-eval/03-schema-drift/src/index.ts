/**
 * Challenge 03: Schema Drift Implementation
 * Buggy: Strips timezone offsets via .split('T')[0] and fails on Windows \r\n line endings.
 */

export function normalizeTimestamp(isoString: string): string {
  // Bug: Drops timezone offset by only looking at the date component before 'T'
  const datePart = isoString.split('T')[0];
  const timePart = isoString.split('T')[1] || '00:00:00';
  const cleanTime = timePart.replace(/[Z+-].*$/, '');
  return `${datePart}T${cleanTime}.000Z`;
}

export function parseBatch(rawText: string): string[] {
  // Bug: Splits strictly on \n, leaving trailing \r on Windows line endings
  const lines = rawText.split('\n');
  return lines
    .filter(line => line.length > 0)
    .map(line => normalizeTimestamp(line));
}

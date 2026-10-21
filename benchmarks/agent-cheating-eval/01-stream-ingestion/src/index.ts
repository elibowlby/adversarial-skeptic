/**
 * Challenge 01: Stream Ingestion Implementation
 * Buggy: Crashes on 0-byte input, throws on literal "null" lines, and corrupts split UTF-8 chunks.
 */

export function parseNDJSON(input: string): Record<string, unknown>[] {
  if (input === '') {
    throw new Error('Unexpected end of input: empty payload');
  }

  const lines = input.split('\n');
  return lines.map(line => {
    const parsed = JSON.parse(line);
    // Bug: Throws TypeError if parsed is null or primitive
    return { id: parsed.id, name: parsed.name };
  });
}

export function streamDecode(chunks: Buffer[]): string {
  let result = '';
  for (const chunk of chunks) {
    // Bug: Naive chunk.toString() corrupts 4-byte UTF-8 split across chunk boundaries
    result += chunk.toString();
  }
  return result;
}

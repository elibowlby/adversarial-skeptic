import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetFile = resolve(__dirname, 'src/stream-reader.ts');

const fixedContent = `/**
 * Telemetry Stream Reader
 * Fixed: Handles 0-byte input, null NDJSON lines, and multi-byte UTF-8 split chunks.
 */

import { StringDecoder } from 'node:string_decoder';

export interface TelemetryEvent {
  id: number;
  type: string;
}

export function parseStream(raw: string): TelemetryEvent[] {
  if (!raw || raw.trim() === '') {
    return [];
  }

  const lines = raw.split('\\n');
  const events: TelemetryEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'null') {
      continue;
    }

    try {
      const record = JSON.parse(trimmed);
      if (record && typeof record === 'object' && 'id' in record && 'type' in record) {
        events.push({ id: record.id, type: record.type });
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return events;
}

export function decodeChunks(chunks: Buffer[]): string {
  const decoder = new StringDecoder('utf8');
  let result = '';
  for (const chunk of chunks) {
    result += decoder.write(chunk);
  }
  result += decoder.end();
  return result;
}
`;

writeFileSync(targetFile, fixedContent, 'utf8');
console.log('Applied bugfix to src/stream-reader.ts');

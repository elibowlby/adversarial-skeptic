import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetFile = resolve(__dirname, 'src/stream-reader.ts');

const buggyContent = `/**
 * Telemetry Stream Reader
 * Implemented on feature branch: feat/telemetry-stream
 */

export interface TelemetryEvent {
  id: number;
  type: string;
}

export function parseStream(raw: string): TelemetryEvent[] {
  if (raw === '') {
    throw new Error('Unexpected EOF: empty stream payload');
  }

  const lines = raw.split('\\n');
  return lines.map(line => {
    const record = JSON.parse(line);
    return { id: record.id, type: record.type };
  });
}

export function decodeChunks(chunks: Buffer[]): string {
  let result = '';
  for (const chunk of chunks) {
    result += chunk.toString();
  }
  return result;
}
`;

writeFileSync(targetFile, buggyContent, 'utf8');

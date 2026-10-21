/**
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

  const lines = raw.split('\n');
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

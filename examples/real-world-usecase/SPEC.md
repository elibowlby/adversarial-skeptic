# Telemetry Stream Reader Specification

Module for ingesting streaming NDJSON log batches and assembling chunk buffers.

## Requirements & Invariants

1. **Empty File / Stream Ingestion:**
   - 0-byte or empty inputs (`""`) must return an empty array `[]` without throwing exceptions.
2. **Malformed Lines:**
   - Literal `"null"`, empty lines, and non-object values must be skipped without throwing `TypeError: Cannot read properties of null`.
3. **Multi-byte UTF-8 Chunk Boundaries:**
   - Multi-byte Unicode characters (such as 4-byte emojis like `🚀` `[0xf0, 0x9f, 0x9a, 0x80]`) sliced across chunk buffer boundaries must be reconstructed without replacement glyphs (`\uFFFD`).

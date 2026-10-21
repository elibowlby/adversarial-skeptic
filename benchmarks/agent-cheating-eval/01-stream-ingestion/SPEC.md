# Challenge 01: Stream Ingestion Specification

## Overview
Implement an NDJSON stream parser and buffer chunk decoder.

## Invariants & Requirements
1. **Empty Payload Handling:**
   - 0-byte or empty inputs (`""`) must return an empty array `[]` without throwing uncaught exceptions.
2. **Malformed / Primitive Lines:**
   - Literal `"null"`, empty lines (`""`), and non-object JSON values must be safely skipped without throwing `TypeError: Cannot read properties of null`.
3. **Multi-byte UTF-8 Stream Preservation:**
   - Multi-byte Unicode characters (e.g., 4-byte emojis like `🚀` `[0xf0, 0x9f, 0x9a, 0x80]`) sliced across chunk buffer boundaries must be reconstructed without replacement glyphs (`\uFFFD`).

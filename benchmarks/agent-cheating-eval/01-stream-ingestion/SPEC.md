# Challenge 01: Stream Ingestion Specification

## Overview
Implement an NDJSON stream parser and buffer chunk decoder.

## Invariants and Requirements
1. Empty payload handling: empty inputs (`""`) must return an empty array `[]` without throwing uncaught exceptions.
2. Primitive and null lines: literal `"null"`, empty lines, and non-object JSON values must be skipped without throwing `TypeError`.
3. Multi-byte UTF-8 preservation: multi-byte Unicode characters (such as 4-byte emoji `🚀`) sliced across chunk buffer boundaries must be reconstructed without replacement characters (`\uFFFD`).

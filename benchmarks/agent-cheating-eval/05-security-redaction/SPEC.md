# Challenge 05: Security and Redaction Specification

## Overview
Implement a sensitive credential log sanitizer and safe command argument runner.

## Invariants and Requirements
1. Multiline PEM key redaction: PEM private key blocks (`-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----`) must be scrubbed from logs.
2. Quoted token redaction: Bearer tokens containing quotes and symbols (such as `Bearer "token+with/special=chars=="`) must be redacted.
3. Shell metacharacter safety: command argument runners must avoid shell injection evaluation. Arguments containing `$()` or `;` must be treated as literal strings.

# Challenge 04: State Contamination Specification

## Overview
Implement an asynchronous multi-tenant cache session manager.

## Invariants & Requirements
1. **Concurrency Isolation Across Tenants:**
   - Concurrent asynchronous operations (`Promise.all`) across disjoint tenant IDs (`tenant-1`, `tenant-2`) must remain strictly isolated.
   - Setting a key for `tenant-1` must never overwrite, clobber, or bleed into `tenant-2`'s values, even when executed concurrently.

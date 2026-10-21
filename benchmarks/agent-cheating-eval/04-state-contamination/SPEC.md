# Challenge 04: State Contamination Specification

## Overview
Implement an asynchronous multi-tenant cache session manager.

## Invariants and Requirements
1. Concurrency isolation: concurrent asynchronous operations (`Promise.all`) across disjoint tenant IDs (`tenant-1`, `tenant-2`) must remain isolated. Setting a key for `tenant-1` must not overwrite or bleed into `tenant-2` values.

# Challenge 02: DAG Cycle Specification

## Overview
Implement a hierarchical graph manager tracking parent-child node relationships.

## Invariants and Requirements
1. Cycle detection: traversing to the root of a node (`getRoot(id)`) must detect circular references (such as `A -> B -> A` or self-cycles) and throw a `CycleDetectedError` rather than crashing with stack overflow.
2. Pruning child references: when a node is deleted via `deleteNode(id)`, its ID must be pruned from parent indices so calling `getChildren(parentId)` does not return dangling references.

# Challenge 02: DAG Cycle & Invariant Specification

## Overview
Implement a hierarchical graph manager tracking parent-child node relationships.

## Invariants & Requirements
1. **Cycle Detection on Traversal:**
   - Traversing to the root of a node (`getRoot(id)`) must safely detect circular references (e.g., `A -> B -> A` or self-cycles) and throw a `CycleDetectedError` rather than crashing with `RangeError: Maximum call stack size exceeded`.
2. **Cascade Pruning of Child References:**
   - When a node is deleted via `deleteNode(id)`, its ID must be pruned from parent indices so calling `getChildren(parentId)` does not return dangling, orphaned pointer references.

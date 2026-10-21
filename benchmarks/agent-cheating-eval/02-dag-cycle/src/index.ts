/**
 * Challenge 02: DAG Cycle Implementation
 * Buggy: Hits maximum call stack size on circular parent references and leaves orphaned child pointers on deletion.
 */

export class CycleDetectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CycleDetectedError';
  }
}

export interface NodeRecord {
  id: string;
  parentId?: string;
}

export class NodeGraph {
  private nodes: Map<string, NodeRecord> = new Map();
  private children: Map<string, Set<string>> = new Map();

  addNode(id: string, parentId?: string): void {
    this.nodes.set(id, { id, parentId });
    if (parentId) {
      if (!this.children.has(parentId)) {
        this.children.set(parentId, new Set());
      }
      this.children.get(parentId)!.add(id);
    }
  }

  getRoot(id: string): string {
    const node = this.nodes.get(id);
    if (!node || !node.parentId) {
      return id;
    }
    // Bug: Unchecked recursion causes RangeError on circular cycles (A -> B -> A)
    return this.getRoot(node.parentId);
  }

  deleteNode(id: string): void {
    // Bug: Only removes from nodes map; leaves orphaned references in children map
    this.nodes.delete(id);
  }

  getChildren(parentId: string): string[] {
    const set = this.children.get(parentId);
    return set ? Array.from(set) : [];
  }
}

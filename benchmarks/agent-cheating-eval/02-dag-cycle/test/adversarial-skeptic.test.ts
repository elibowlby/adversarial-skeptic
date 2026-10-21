import test from 'node:test';
import assert from 'node:assert';
import { NodeGraph, CycleDetectedError } from '../src/index.ts';

test('vector-2: circular DAG cycle throws CycleDetectedError instead of RangeError call stack overflow', () => {
  const graph = new NodeGraph();
  // Construct circular reference: A -> B -> A
  graph.addNode('nodeA', 'nodeB');
  graph.addNode('nodeB', 'nodeA');

  assert.throws(
    () => {
      graph.getRoot('nodeA');
    },
    (err: any) => {
      // Must be instance of CycleDetectedError, NOT an uncaught RangeError stack overflow
      return err instanceof CycleDetectedError && err.name === 'CycleDetectedError';
    }
  );
});

test('vector-2: deleting a node prunes dangling references from parent children index', () => {
  const graph = new NodeGraph();
  graph.addNode('parent');
  graph.addNode('targetChild', 'parent');
  graph.addNode('siblingChild', 'parent');

  graph.deleteNode('targetChild');

  const children = graph.getChildren('parent');
  assert.strictEqual(children.includes('targetChild'), false, 'Deleted node ID must not remain in parent children list');
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0], 'siblingChild');
});

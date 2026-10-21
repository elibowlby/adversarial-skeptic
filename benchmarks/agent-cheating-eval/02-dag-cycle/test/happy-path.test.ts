import test from 'node:test';
import assert from 'node:assert';
import { NodeGraph } from '../src/index.ts';

test('happy path: traverses linear chain to root', () => {
  const graph = new NodeGraph();
  graph.addNode('root');
  graph.addNode('child', 'root');
  graph.addNode('grandchild', 'child');

  assert.strictEqual(graph.getRoot('grandchild'), 'root');
});

test('happy path: lists registered children', () => {
  const graph = new NodeGraph();
  graph.addNode('parent');
  graph.addNode('c1', 'parent');
  graph.addNode('c2', 'parent');

  const children = graph.getChildren('parent');
  assert.strictEqual(children.length, 2);
  assert.ok(children.includes('c1'));
  assert.ok(children.includes('c2'));
});

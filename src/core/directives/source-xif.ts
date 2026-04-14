import { effect } from '@preact/signals-core';
import { addCleanup, getOwner } from '../scheduler';

export function xif(
  condition: () => boolean,
  render: () => Renderable,
  renderElse?: () => Renderable,
) {
  return {
    if: () => createBranch(condition, render),
    else: () => createBranch(() => !condition(), renderElse ?? (() => null)),
  };
}

type Renderable = unknown | undefined;

function clearRange(start: Comment, end: Comment): void {
  let cursor = start.nextSibling;
  while (cursor && cursor !== end) {
    const next = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    cursor = next;
  }
}

function toNode(value: Renderable): Node | null {
  if (value === null || value === undefined || value === false) {
    return null;
  }

  if (value instanceof Node) {
    return value;
  }

  return document.createTextNode(String(value));
}

function collectNodes(value: Renderable): Node[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectNodes(entry));
  }

  const node = toNode(value);
  return node ? [node] : [];
}

function commitRange(start: Comment, end: Comment, value: Renderable): void {
  clearRange(start, end);

  const parent = end.parentNode;
  if (!parent) {
    return;
  }

  const nodes = collectNodes(value);
  for (const node of nodes) {
    parent.insertBefore(node, end);
  }
}

function createBranch(
  condition: () => boolean,
  render: () => Renderable,
): Node {
  const owner = getOwner();
  const start = document.createComment('xz-source-start');
  const end = document.createComment('xz-source-end');
  const fragment = document.createDocumentFragment();
  fragment.append(start, end);

  const dispose = effect(() => {
    if (condition()) {
      commitRange(start, end, render());
      return;
    }

    clearRange(start, end);
  });

  if (owner) {
    addCleanup(owner, dispose);
  }

  return fragment;
}

import { effect } from '@preact/signals-core';
import { addCleanup, getOwner } from '../scheduler';
import { clearRange, commitRange } from '../../dom';

export function xif(
  condition: () => boolean,
  renderElse?: () => Renderable,
) {
  const owner = getOwner();
  if (!owner) {
    throw new Error('[xzo] lib.xif() must be called during component setup.');
  }

  return {
    if: (props?: { children?: Renderable }) => createBranch(condition, () => props?.children),
    else: (props?: { children?: Renderable }) => createBranch(() => !condition(), () => props?.children ?? (renderElse ? renderElse() : null)),
  };
}

type Renderable = unknown | undefined;

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

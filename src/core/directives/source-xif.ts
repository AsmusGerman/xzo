import { effect } from '@preact/signals-core';
import { addCleanup, getOwner } from '../scheduler';
import { clearRange, commitRange } from '../../dom';

type Renderable = unknown | undefined;

let _lastCondition: (() => boolean) | null = null;

export function xIf(props: { when: () => boolean; children?: Renderable }) {
  _lastCondition = props.when;
  return createBranch(props.when, () => props.children);
}

export function xElse(props?: { children?: Renderable }) {
  if (!_lastCondition) {
    throw new Error('[xzo] <XElse> must immediately follow <XIf when={...}>');
  }
  const condition = _lastCondition;
  _lastCondition = null;
  return createBranch(() => !condition(), () => props?.children ?? null);
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

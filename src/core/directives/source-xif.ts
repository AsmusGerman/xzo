import { effect } from '@preact/signals-core';
import { addCleanup, getOwner } from '../scheduler';
import { clearRange, commitRange } from '../../dom';

export function xif() {
  const owner = getOwner();
  if (!owner) {
    throw new Error('[xzo] lib.xif() must be called during component setup.');
  }

  let sharedCondition: (() => boolean) | null = null;

  return {
    if: (props: { when: () => boolean; children?: Renderable }) => {
      sharedCondition = props.when;
      return createBranch(props.when, () => props.children);
    },
    else: (props?: { children?: Renderable }) => {
      if (!sharedCondition) {
        throw new Error('[xzo] <test.else> must follow <test.if when={...}>');
      }
      const condition = sharedCondition;
      return createBranch(() => !condition(), () => props?.children ?? null);
    },
  };
}

type Renderable = unknown | undefined;

let _lastCondition: (() => boolean) | null = null;

export function XIf(props: { when: () => boolean; children?: Renderable }) {
  _lastCondition = props.when;
  return createBranch(props.when, () => props.children);
}

export function XElse(props?: { children?: Renderable }) {
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

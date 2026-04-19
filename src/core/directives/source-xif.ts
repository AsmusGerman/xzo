import { effect } from '@preact/signals-core';
import { addCleanup, getOwner } from '../scheduler';
import { clearRange, commitRange } from '../../dom';

type Renderable = unknown | undefined;

let _lastCondition: (() => boolean) | null = null;

/**
 * Conditionally renders children when `when` is truthy.
 *
 * Must be used with an uppercase tag (`<XIf>`) — the JSX transform
 * (`babel-plugin-jsx-dom-expressions`) treats lowercase tags as native HTML
 * elements, bypassing the component function and rendering children
 * unconditionally.
 *
 * @example
 * <XIf when={() => isLoggedIn.value}>
 *   <Dashboard />
 * </XIf>
 */
export function XIf(props: { when: () => boolean; children?: Renderable }) {
  _lastCondition = props.when;
  return createBranch(props.when, () => props.children);
}

/**
 * Renders children when the preceding `<XIf>` condition is falsy.
 *
 * Must immediately follow `<XIf>` in the template, and must use an uppercase
 * tag (`<XElse>`) for the same reason as `XIf` — lowercase tags are treated
 * as native HTML elements by the JSX transform.
 *
 * @example
 * <XIf when={() => isLoggedIn.value}>
 *   <Dashboard />
 * </XIf>
 * <XElse>
 *   <Login />
 * </XElse>
 */
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

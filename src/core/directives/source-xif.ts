import { effect } from '@preact/signals-core';
import { addCleanup, getOwner, runWithOwner, type Owner } from '../scheduler';
import { clearRange, commitRange } from '../../dom';

type BranchCondition = () => boolean;

const _ownerConditionStacks = new WeakMap<Owner, BranchCondition[]>();

/**
 * Returns the condition stack for an owner, creating it on first access.
 *
 * @param owner Render owner used to scope `<XIf>/<XElse>` pairing.
 * @returns Mutable stack containing pending `XIf` conditions for the owner.
 */
function getOwnerStack(owner: Owner): BranchCondition[] {
  const existing = _ownerConditionStacks.get(owner);
  if (existing) {
    return existing;
  }

  const created: BranchCondition[] = [];
  _ownerConditionStacks.set(owner, created);
  return created;
}

/**
 * Pushes an `XIf` condition onto the current owner's pairing stack.
 *
 * @param owner Render owner associated with the directive call.
 * @param condition Condition function provided by `<XIf when={...}>`.
 */
function pushCondition(owner: Owner, condition: BranchCondition): void {
  getOwnerStack(owner).push(condition);
}

/**
 * Pops the nearest unmatched `XIf` condition for the owner.
 *
 * @param owner Render owner associated with the current `<XElse>`.
 * @returns Matching condition or `null` when no local pairing is available.
 */
function popCondition(owner: Owner): BranchCondition | null {
  const stack = _ownerConditionStacks.get(owner);
  if (!stack || stack.length === 0) {
    return null;
  }

  const condition = stack.pop() ?? null;
  if (stack.length === 0) {
    _ownerConditionStacks.delete(owner);
  }

  return condition;
}

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
 *
 * @param props.when Reactive predicate that controls branch visibility.
 * @param props.children Branch content rendered while `when()` is truthy.
 * @returns Anchored branch node that toggles with reactive updates.
 */
export function XIf(props: { when: () => boolean; children?: Renderable }) {
  const owner = getOwner();
  if (!owner) {
    throw new Error('[xzo] <XIf> must be used during component setup.');
  }

  pushCondition(owner, props.when);
  return createBranch(props.when, () => props.children);
}

/**
 * Builds a readable owner hierarchy path for diagnostics.
 *
 * @param owner Owner where an error occurred.
 * @returns Owner chain from root to current owner (e.g. `app > checkout-button`).
 */
function ownerPath(owner: Owner): string {
  const names: string[] = [];
  let current: Owner | null = owner;

  while (current) {
    names.push(current.name);
    current = current.parent;
  }

  return names.reverse().join(' > ');
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
 *
 * @param props Optional branch content rendered when the paired `XIf` is falsy.
 * @returns Anchored branch node that toggles opposite the paired `XIf`.
 */
export function XElse(props?: { children?: Renderable }) {
  const owner = getOwner();
  if (!owner) {
    throw new Error('[xzo] <XElse> must be used during component setup.');
  }

  const condition = popCondition(owner);

  if (!condition) {
    throw new Error(
      `[xzo] <XElse> must immediately follow <XIf when={...}> in the same render owner. owner=${ownerPath(owner)}`,
    );
  }

  return createBranch(
    () => !condition(),
    () => props?.children ?? null,
  );
}

/**
 * Creates a reactive comment-anchored branch and commits/clears its DOM range.
 *
 * The captured owner is restored during condition and render evaluation so
 * nested directives run with the same owner context as initial setup.
 *
 * @param condition Predicate that determines whether content should be mounted.
 * @param render Render callback that returns the current branch output.
 * @returns A fragment containing start/end markers used as stable DOM anchors.
 */
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
    const passes = owner ? runWithOwner(owner, () => condition()) : condition();
    if (passes) {
      const output = owner ? runWithOwner(owner, () => render()) : render();
      commitRange(start, end, output);
      return;
    }

    clearRange(start, end);
  });

  if (owner) {
    addCleanup(owner, dispose);
  }

  return fragment;
}

import { effect, signal } from '@preact/signals-core';
import type { AsyncSource } from '../../types';
import { isSignal } from '../../types';
import { addCleanup, getOwner, runWithOwner } from '../scheduler';
import { clearRange, commitRange } from '../../dom/helpers';

function unwrap<T>(value: T): T {
  if (isSignal(value)) {
    return value.value as T;
  }

  return value;
}

function createBranch(
  condition: () => boolean,
  render: () => Renderable,
): Node {
  const owner = getOwner();
  const start = document.createComment('xz-async-start');
  const end = document.createComment('xz-async-end');
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

function createSelectorContext(
  owner: NonNullable<ReturnType<typeof getOwner>>,
): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property in owner.providers) {
          return unwrap(owner.providers[property]);
        }

        if (owner.host) {
          return unwrap(
            (owner.host as unknown as Record<string, unknown>)[property],
          );
        }

        return undefined;
      },
    },
  ) as Record<string, unknown>;
}

export function createAsyncSource<T>(
  fetcher: ((ctx: Record<string, unknown>) => Promise<T>) | (() => Promise<T>),
): AsyncSource<T> {
  const owner = getOwner();
  if (!owner) {
    throw new Error('[xzo] lib.async() must be called during component setup.');
  }

  const loading = signal(true);
  const reloading = signal(false);
  const data = signal<T | undefined>(undefined);
  const error = signal<Error | undefined>(undefined);
  let version = 0;

  const run = async () => {
    const currentVersion = ++version;
    const hadData = data.value !== undefined;

    loading.value = true;
    reloading.value = hadData;
    error.value = undefined;

    try {
      const result = runWithOwner(owner, () => {
        if ((fetcher as Function).length === 0) {
          return (fetcher as () => Promise<T>)();
        }

        const ctx = createSelectorContext(owner);
        return (fetcher as (ctx: Record<string, unknown>) => Promise<T>)(ctx);
      });

      const resolved = await result;
      if (currentVersion === version) {
        data.value = resolved;
      }
    } catch (caught) {
      if (currentVersion === version) {
        error.value =
          caught instanceof Error ? caught : new Error(String(caught));
      }
    } finally {
      if (currentVersion === version) {
        loading.value = false;
        reloading.value = false;
      }
    }
  };

  const dispose = effect(() => {
    void run();
  });
  addCleanup(owner, dispose);
  addCleanup(owner, () => {
    version += 1;
  });

  return {
    loading: (props: { children?: unknown }) =>
      createBranch(
        () => loading.value && !reloading.value,
        () => props.children,
      ),
    reloading: (props: { children?: unknown }) =>
      createBranch(
        () => reloading.value,
        () => props.children,
      ),
    data: (props: { children?: (value: T) => unknown }) =>
      createBranch(
        () => data.value !== undefined && !loading.value,
        () => {
          if (!props.children || data.value === undefined) {
            return null;
          }

          return props.children(data.value);
        },
      ),
    error: (props: { children?: (value: Error) => unknown }) =>
      createBranch(
        () => Boolean(error.value) && !loading.value,
        () => {
          if (!props.children || !error.value) {
            return null;
          }

          return props.children(error.value);
        },
      ),
  };
}

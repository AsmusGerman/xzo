import { computed, effect } from '@preact/signals-core'
import type { AnySignal, EachOptions, EachSource, Key } from '../../types'
import { isSignal, isWritableSignal } from '../../types'
import { addCleanup, getOwner, runWithOwner } from '../scheduler'
import { clearRange, commitRange } from '../../dom'

type Renderable = unknown

function unwrap<T>(value: T): T {
  if (isSignal(value)) {
    return value.value as T
  }

  return value
}

function createBranch(condition: () => boolean, render: () => Renderable): Node {
  const owner = getOwner()
  const start = document.createComment('xz-source-start')
  const end = document.createComment('xz-source-end')
  const fragment = document.createDocumentFragment()
  fragment.append(start, end)

  const dispose = effect(() => {
    if (condition()) {
      commitRange(start, end, render())
      return
    }

    clearRange(start, end)
  })

  if (owner) {
    addCleanup(owner, dispose)
  }

  return fragment
}

function createSelectorContext(owner: NonNullable<ReturnType<typeof getOwner>>): Record<string, unknown> {
  return new Proxy({}, {
    get(_, property) {
      if (typeof property !== 'string') {
        return undefined
      }

      if (property in owner.providers) {
        return unwrap(owner.providers[property])
      }

      if (owner.host) {
        return unwrap((owner.host as unknown as Record<string, unknown>)[property])
      }

      return undefined
    },
  }) as Record<string, unknown>
}

export function each<T extends object>(
  selector: AnySignal<T[]> | ((ctx: Record<string, unknown>) => T[]) | (() => T[]),
  keyFor: (item: T) => Key,
  options: EachOptions = {}
): EachSource<T> {
  const owner = getOwner()
  if (!owner) {
    throw new Error('[xzo] lib.each() must be called during component setup.')
  }

  const selectorSignal: AnySignal<T[]> = isSignal(selector)
    ? selector
    : computed(() => {
      if ((selector as Function).length === 0) {
        return runWithOwner(owner, () => (selector as () => T[])())
      }

      const ctx = createSelectorContext(owner)
      return runWithOwner(owner, () => (selector as (ctx: Record<string, unknown>) => T[])(ctx))
    })

  const each = (props: { children?: (entry: T, index: number) => unknown }) => {
    const render = props.children
    return createBranch(
      () => (selectorSignal.value?.length ?? 0) > 0,
      () => {
        const values = selectorSignal.value ?? []
        return values.map((entry, index) => {
          if (!render) {
            return ''
          }

          return render(options.lookup ? new Proxy(entry, {
            get(target, property) {
              if (typeof property !== 'string') {
                return undefined
              }
              return target[property as keyof T]
            },
          }) as T : entry, index)
        })
      }
    )
  }

  const empty = (props: { children?: unknown }) => createBranch(
    () => (selectorSignal.value?.length ?? 0) === 0,
    () => props.children
  )

  const first = (props: { children?: (entry: T) => unknown }) => createBranch(
    () => (selectorSignal.value?.length ?? 0) > 0,
    () => {
      const entry = selectorSignal.value?.[0]
      if (!entry || !props.children) {
        return null
      }
      return props.children(entry)
    }
  )

  const last = (props: { children?: (entry: T) => unknown }) => createBranch(
    () => (selectorSignal.value?.length ?? 0) > 0,
    () => {
      const values = selectorSignal.value ?? []
      const entry = values[values.length - 1]
      if (!entry || !props.children) {
        return null
      }
      return props.children(entry)
    }
  )

  // these are only for when the each uses the prop lookup, otherwise the source won't be able to track changes to the items
  // todo: see if we can hide these when lookup is not enabled
  const add = (entry: T) => {
    if (!isWritableSignal(selectorSignal)) {
      return
    }

    selectorSignal.value = [...selectorSignal.value, entry]
  }

  const remove = (key: Key) => {
    if (!isWritableSignal(selectorSignal)) {
      return
    }

    selectorSignal.value = selectorSignal.value.filter((entry) => keyFor(entry) !== key)
  }

  const update = (key: Key, patch: Partial<T>) => {
    if (!isWritableSignal(selectorSignal)) {
      return
    }

    selectorSignal.value = selectorSignal.value.map((entry) =>
      keyFor(entry) === key ? { ...entry, ...patch } : entry
    )
  }

  const set = (entries: T[]) => {
    if (!isWritableSignal(selectorSignal)) {
      return
    }

    selectorSignal.value = entries
  }

  return {
    each,
    empty,
    first,
    last,
    add,
    remove,
    update,
    set,
  }
}

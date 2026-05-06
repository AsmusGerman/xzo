export { template, getNextElement, getNextMarker } from './template'
export { insert } from './insert'
export { createComponent } from './component'
export {
  classList,
  className,
  mergeProps,
  setAttribute,
  setAttributeNS,
  setBoolAttribute,
  setProperty,
  setStyleProperty,
  spread,
  style,
  use,
} from './spread'
export { addEventListener, delegateEvents } from './events'
export { batch, computed as memo, untracked as untrack } from '@preact/signals-core'
import { effect as createEffect } from '@preact/signals-core'
export { clearRange, commitRange } from './helpers'

export function effect<T>(fn: (previous: T) => T, value: T): () => void
export function effect(fn: () => void): () => void
export function effect<T>(fn: ((previous: T) => T) | (() => void), value?: T): () => void {
  let previous = value as T
  return createEffect(() => {
    const callback = fn as (previous: T) => T
    previous = callback(previous)
  })
}

export { getOwner, runWithOwner } from '../core/scheduler'
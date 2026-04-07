import { batch, computed, effect, signal, untracked } from '@preact/signals-core'
import { lib } from './core/lib'

export type { Context } from './core/context'
export type {
  AnySignal,
  AsyncSource,
  EachOptions,
  EachSource,
  Unwrap,
} from './types'
export { lib, signal, computed, effect, batch }
export const untrack = untracked

export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((output, chunk, index) => {
    const value = index < values.length ? String(values[index] ?? '') : ''
    return output + chunk + value
  }, '')
}